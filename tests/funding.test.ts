// Run:  npx tsx --test tests/*.test.ts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
	answerFundingQuestion,
	detectSpecies,
	detectUrgency,
	rankSources,
	speciesMatches,
	type FundingRow
} from '../src/lib/server/ai/funding';

const row = (
	p: Partial<FundingRow> & { id: string; name: string; category: string }
): FundingRow => ({
	url: `https://example.org/${p.id}`,
	scope: 'NATIONAL',
	species: 'Dogs, Cats',
	conditions: 'General help',
	eligibility: 'Anyone',
	howToApply: 'Apply online',
	maxAwardCents: null,
	maxAwardNote: null,
	incomeRestricted: false,
	vetMustApply: false,
	isVerified: true,
	...p
});
const rows: FundingRow[] = [
	row({ id: 'carecredit', name: 'CareCredit', category: 'CREDIT', species: 'All pets' }),
	row({
		id: 'redrover',
		name: 'RedRover Relief Urgent Care Grant',
		category: 'GRANT',
		conditions: 'Life-threatening injury or illness needing urgent, specific treatment.',
		incomeRestricted: true,
		maxAwardCents: 50000
	}),
	row({
		id: 'petfund',
		name: 'The Pet Fund',
		category: 'CHARITY',
		conditions: 'Non-basic, NON-urgent care only. Will not fund emergencies.'
	}),
	row({
		id: 'hr-spca',
		name: 'Hampton Roads Low-Cost Clinic',
		category: 'LOW_COST_CARE',
		scope: 'HAMPTON_ROADS'
	}),
	row({ id: 'birds', name: 'Bird Fund', category: 'GRANT', species: 'Birds' }),
	row({ id: 'unverified', name: 'Unverified Grant', category: 'GRANT', isVerified: false })
];
let lastWhere: object | undefined;
const fakeDb = {
	fundingSource: {
		findMany: async (a: { where: object }) => ((lastWhere = a.where), rows.map((r) => ({ ...r })))
	}
};

// Fake OpenAI-compatible server standing in for ODU's LLM
let lastBody: { model: string; messages: { role: string; content: string }[] } | undefined;
const server = createServer((req, res) => {
	let b = '';
	req.on('data', (c) => (b += c));
	req.on('end', () => {
		lastBody = JSON.parse(b);
		res.setHeader('Content-Type', 'application/json');
		res.end(
			JSON.stringify({
				choices: [
					{
						message: {
							content:
								'Start with [1], then [2]. Visit https://evil.example or mail help@evil.example for more.'
						}
					}
				]
			})
		);
	});
});
await new Promise<void>((r) => server.listen(0, r));
const port = (server.address() as { port: number }).port;
const llm = { baseUrl: `http://localhost:${port}/v1`, model: 'odu-test' };
after(() => server.close());

test('detects species and urgency', () => {
	assert.equal(detectSpecies('my kitten needs surgery'), 'cat');
	assert.equal(detectSpecies('help', 'Dogs'), 'dog');
	assert.equal(detectSpecies('help paying'), null);
	assert.equal(detectUrgency('my dog needs emergency surgery tonight'), true);
	assert.equal(detectUrgency('dental cleaning for my cat'), false);
	assert.equal(detectUrgency('how do I pay a vet bill'), null);
	assert.ok(speciesMatches('Dogs, Cats (one animal per application)', 'dog'));
	assert.ok(speciesMatches('All pets', 'rabbit'));
	assert.ok(!speciesMatches('Birds', 'dog'));
});

test('ranks grants before credit, local before national, verified before unverified', () => {
	const names = rankSources(
		rows.filter((r) => r.id !== 'birds'),
		{ question: '' }
	).map((r) => r.id);
	assert.deepEqual(names, ['redrover', 'unverified', 'petfund', 'hr-spca', 'carecredit']);
});

test('an emergency pushes non-urgent-only charities down', () => {
	const names = rankSources(
		rows.filter((r) => r.id !== 'birds'),
		{ question: '', urgent: true }
	).map((r) => r.id);
	assert.ok(names.indexOf('petfund') > names.indexOf('carecredit'));
	assert.equal(names[0], 'redrover');
});

test('looks up first, filters species, passes rows to the LLM, links only from DB', async () => {
	const r = await answerFundingQuestion(fakeDb, llm, {
		question: 'How can I pay for my dog’s surgery?'
	});
	assert.deepEqual(lastWhere, { retiredAt: null });
	assert.ok(!r.sources.some((s) => s.name === 'Bird Fund'));
	assert.equal(r.sources[0].name, 'RedRover Relief Urgent Care Grant');
	assert.equal(r.sources[0].url, 'https://example.org/redrover');
	assert.ok(r.sources.length >= 3, 'done-when: at least three sources');
	assert.ok(r.sources.every((s) => s.url.startsWith('https://')));
	assert.ok(!/evil\.example/.test(r.reply), 'model URLs and emails are stripped');
	assert.equal(lastBody?.model, 'odu-test');
	assert.match(lastBody!.messages[1].content, /\[1\] RedRover/);
	assert.match(lastBody!.messages[1].content, /income limits apply/);
	assert.equal(r.aiUsed, true);
	assert.equal(r.sources.find((s) => s.name === 'CareCredit')?.mustRepay, true);
});

test('still answers when the LLM is down', async () => {
	const r = await answerFundingQuestion(
		fakeDb,
		{ baseUrl: 'http://localhost:1/v1', model: 'x', timeoutMs: 2000 },
		{ question: 'help with my cat bill' }
	);
	assert.equal(r.aiUsed, false);
	assert.match(r.reply, /RedRover/);
	assert.ok(r.sources.length >= 3);
});
