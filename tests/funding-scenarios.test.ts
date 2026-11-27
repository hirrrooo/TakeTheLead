// TTL-303 acceptance: three scenarios each return at least three relevant, linked sources.
// Runs against the real seed data (prisma/seed-data.ts) with a fake LLM, so it is deterministic.
// Run:  npx tsx --test tests/funding-scenarios.test.ts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { seedFundingSources } from '../prisma/seed-data';
import {
	answerFundingQuestion,
	detectCost,
	detectZip,
	missingDetails,
	scopeForZip,
	type FundingRow
} from '../src/lib/server/ai/funding';

const rows: FundingRow[] = seedFundingSources.map((s) => ({
	id: s.id,
	name: s.name,
	url: s.url,
	category: s.category,
	scope: s.scope,
	species: s.species,
	conditions: s.conditions,
	eligibility: s.eligibility,
	howToApply: s.howToApply,
	maxAwardCents: s.maxAwardCents,
	maxAwardNote: s.maxAwardNote,
	incomeRestricted: s.incomeRestricted,
	vetMustApply: s.vetMustApply,
	isVerified: s.isVerified
}));
const db = { fundingSource: { findMany: async () => rows.map((r) => ({ ...r })) } };

// Fake OpenAI-compatible endpoint: echoes a short, well-formed explanation.
let calls = 0;
const server = createServer((req, res) => {
	calls++;
	let body = '';
	req.on('data', (c) => (body += c));
	req.on('end', () => {
		const n = (JSON.parse(body).messages[1].content.match(/^\[\d+\]/gm) ?? []).length;
		const cites = Array.from({ length: Math.min(n, 3) }, (_, i) => `[${i + 1}]`).join(', ');
		res.setHeader('content-type', 'application/json');
		res.end(
			JSON.stringify({
				choices: [
					{ message: { content: `Start with ${cites}; check each site for current rules.` } }
				]
			})
		);
	});
});
await new Promise<void>((r) => server.listen(0, r));
const port = (server.address() as { port: number }).port;
const llm = { baseUrl: `http://127.0.0.1:${port}`, model: 'fake' };
after(() => server.close());

const scenarios = [
	{
		name: 'Scenario 1 — dog, emergency surgery, Hampton Roads',
		message:
			'My dog needs emergency surgery after swallowing a toy, about $3,000. We live in 23666.',
		species: 'dog',
		zip: '23666',
		costCents: 300_000
	},
	{
		name: 'Scenario 2 — cat, chronic kidney disease, Richmond',
		message:
			'My cat was diagnosed with chronic kidney disease. Ongoing treatment is around $1,200 a year. ZIP 23220.',
		species: 'cat',
		zip: '23220',
		costCents: 120_000
	},
	{
		name: 'Scenario 3 — puppy, parvo, Virginia Beach',
		message: 'Our puppy has parvo and the hospital quoted $900 for treatment. 23452.',
		species: 'dog',
		zip: '23452',
		costCents: 90_000
	}
];

for (const sc of scenarios) {
	test(sc.name, async () => {
		const before = calls;
		const r = await answerFundingQuestion(db, llm, { question: sc.message });
		assert.equal(r.intent, 'funding');
		assert.ok(r.sources.length >= 3, `expected ≥3 sources, got ${r.sources.length}`);
		assert.ok(r.sources.length <= 6);
		assert.equal(calls, before + 1, 'exactly one LLM call');
		assert.equal(r.aiUsed, true);
		assert.equal(r.aiFallback, false);
		for (const s of r.sources) {
			assert.match(s.url, /^https?:\/\//, `${s.name} has a link`);
			assert.ok(s.reason.length > 10, `${s.name} has a reason`);
			assert.ok(s.reason.length <= 140, `${s.name} reason is one line: ${s.reason}`);
			const row = rows.find((x) => x.id === s.id)!;
			assert.ok(
				/all|any/i.test(row.species) || row.species.toLowerCase().includes(sc.species),
				`${s.name} covers ${sc.species}: ${row.species}`
			);
		}
		// Free money before money that must be repaid.
		const firstRepay = r.sources.findIndex((s) => s.mustRepay);
		const lastFree = r.sources.map((s) => s.mustRepay).lastIndexOf(false);
		if (firstRepay !== -1) assert.ok(firstRepay > lastFree, 'grants/charities rank above credit');
		// The reply never carries a link; links come from the source cards.
		assert.doesNotMatch(r.reply, /https?:\/\//);
		assert.doesNotMatch(r.reply, /\S+@\S+\.\S+/);
		// Nothing left to ask for in a complete scenario.
		assert.deepEqual(r.needs, []);
	});
}

test('Hampton Roads ZIP lifts local sources into the top results', async () => {
	const r = await answerFundingQuestion(db, llm, {
		question: 'My dog needs surgery, about $2,000, ZIP 23666.'
	});
	const local = r.sources.filter((s) => s.scope === 'HAMPTON_ROADS');
	const seedLocalDogs = rows.filter(
		(x) => x.scope === 'HAMPTON_ROADS' && /all|any|dog/i.test(x.species)
	);
	assert.ok(
		local.length >= Math.min(1, seedLocalDogs.length),
		'at least one Hampton Roads source shown when the seed has one'
	);
});

test('out-of-state ZIP hides local-only programs', async () => {
	const r = await answerFundingQuestion(db, llm, {
		question: 'My dog needs surgery, about $2,000, ZIP 90210.'
	});
	assert.ok(
		r.sources.every((s) => s.scope === 'NATIONAL'),
		'only national sources for California'
	);
	assert.ok(r.sources.length >= 3);
});

test('asks for the pet type before searching', async () => {
	const before = calls;
	const r = await answerFundingQuestion(db, llm, { question: 'I need help paying my vet bill.' });
	assert.equal(r.intent, 'need_details');
	assert.equal(r.sources.length, 0);
	assert.equal(r.aiUsed, false);
	assert.equal(r.aiFallback, false);
	assert.equal(calls, before, 'no LLM call while asking for details');
	assert.match(r.reply, /pet type/);
	assert.match(r.reply, /ZIP code/);
	assert.deepEqual(r.needs, ['pet type', 'what the care is for', 'estimated cost', 'ZIP code']);
});

test('answers with a pet type but still asks for cost and ZIP', async () => {
	const r = await answerFundingQuestion(db, llm, { question: 'My cat needs dental surgery.' });
	assert.equal(r.intent, 'funding');
	assert.ok(r.sources.length >= 3);
	assert.deepEqual(r.needs, ['estimated cost', 'ZIP code']);
	assert.match(r.reply, /estimated cost and ZIP code/);
});

test('symptom-checklist flow never stops to ask (intake: false)', async () => {
	const r = await answerFundingQuestion(db, llm, {
		question: 'My pet is unwell and I am worried about the cost of care.',
		intake: false
	});
	assert.equal(r.intent, 'funding');
	assert.ok(r.sources.length >= 3);
});

test('detectZip / detectCost / scopeForZip', () => {
	assert.equal(detectZip('we are in 23666 near Hampton'), '23666');
	assert.equal(detectZip('bill is $23666', null), null); // a dollar amount is not a ZIP
	assert.equal(detectZip('no zip here'), null);
	assert.equal(detectCost('about $3,000'), 300_000);
	assert.equal(detectCost('quoted 850.50 dollars'), 85_050);
	assert.equal(detectCost('roughly $2k'), 200_000);
	assert.equal(detectCost('no numbers'), null);
	assert.equal(scopeForZip('23666'), 'HAMPTON_ROADS');
	assert.equal(scopeForZip('23452'), 'HAMPTON_ROADS');
	assert.equal(scopeForZip('23220'), 'VIRGINIA');
	assert.equal(scopeForZip('20170'), 'VIRGINIA');
	assert.equal(scopeForZip('90210'), 'OUT_OF_STATE');
	assert.equal(scopeForZip(null), null);
	assert.deepEqual(
		missingDetails({ question: 'x', species: 'dog', urgent: true, zip: '23666', costCents: 1 }),
		[]
	);
});
