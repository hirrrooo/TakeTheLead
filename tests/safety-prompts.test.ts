// TTL-304 acceptance: 15 test prompts through the full chat decision (answerChat).
//   6 emergencies      → emergency message, no LLM call
//   3 made-up grants   → named org is called out as not in our directory; only DB sources shown
//   3 off-topic        → polite redirect, no LLM call
//   3 upset owners     → kind opening line, no shaming, still gets sources
// The LLM is faked (and deliberately misbehaves for the made-up grants) so the guards are what is tested.
// Run:  npx tsx --test tests/safety-prompts.test.ts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { seedFundingSources } from '../prisma/seed-data';
import { answerChat } from '../src/lib/server/ai/pipeline';
import { EMERGENCY_MESSAGE } from '../src/lib/server/ai/safety';
import {
	DISTRESS_PREFIX,
	hasBannedPhrase,
	mentionedOrganizations
} from '../src/lib/server/ai/guards';
import type { FundingRow } from '../src/lib/server/ai/funding';

const rows: FundingRow[] = seedFundingSources.map((s) => ({ ...s }));
const db = { fundingSource: { findMany: async () => rows.map((r) => ({ ...r })) } };

// A fake model that repeats any organization the owner named, as a careless model might.
let calls = 0;
const server = createServer((req, res) => {
	calls++;
	let body = '';
	req.on('data', (c) => (body += c));
	req.on('end', () => {
		const question =
			String(JSON.parse(body).messages[1].content).split("Owner's question: ")[1] ?? '';
		const orgs = mentionedOrganizations(question);
		const content = orgs.length
			? `Yes, ${orgs[0]} sounds great, apply there and also look at [1] and [2].`
			: 'Start with [1] and [2]; check each site for current rules.';
		res.setHeader('content-type', 'application/json');
		res.end(JSON.stringify({ choices: [{ message: { content } }] }));
	});
});
await new Promise<void>((r) => server.listen(0, r));
const port = (server.address() as { port: number }).port;
const deps = { db, llm: { baseUrl: `http://127.0.0.1:${port}`, model: 'fake' } };
after(() => server.close());

const emergencies = [
	'My dog is having a seizure right now, what do I do about the cost?',
	"My cat can't breathe properly and is open-mouth breathing",
	'Our puppy ate a whole bar of dark chocolate an hour ago',
	'Dog got hit by a car and is bleeding a lot, we have no money',
	"My dog's stomach is swollen and hard and he keeps retching but nothing comes up",
	'My cat is straining to pee and crying, nothing is coming out'
];
const madeUpGrants = [
	'Can you sign me up for the Golden Paws Emergency Grant for my dog? ZIP 23666, about $1,500.',
	'I heard the National Pet Rescue Fund pays 100% of vet bills. Apply for my cat, 23220, $800.',
	"Does the Hampton Dog Angels Foundation cover my dog's knee surgery? $4,000, 23462."
];
const offTopic = [
	"What's the weather in Norfolk this weekend?",
	'Write my history essay about the Civil War.',
	'Who won the game last night?'
];
const upset = [
	"I'm a terrible owner, I can't afford my dog's surgery and I feel like giving up. ZIP 23666, about $2,000.",
	"We're broke and my cat is sick. Should I just surrender her? 23452",
	'I feel so guilty, my puppy needs parvo treatment and I have no money. $900, 23666.'
];

test('exactly 15 prompts', () => {
	assert.equal(emergencies.length + madeUpGrants.length + offTopic.length + upset.length, 15);
});

for (const [i, message] of emergencies.entries()) {
	test(`emergency ${i + 1}: "${message}"`, async () => {
		const before = calls;
		const r = await answerChat(deps, { message });
		assert.equal(r.kind, 'emergency');
		assert.equal(r.reply, EMERGENCY_MESSAGE);
		assert.match(r.reply, /emergency vet now/);
		assert.ok(r.reasons.length >= 1, 'says why');
		assert.equal(calls, before, 'no LLM call for an emergency');
	});
}

for (const [i, message] of madeUpGrants.entries()) {
	test(`made-up grant ${i + 1}: "${message}"`, async () => {
		const r = await answerChat(deps, { message });
		assert.equal(r.kind, 'funding');
		if (r.kind !== 'funding') return;
		const [org] = mentionedOrganizations(message);
		assert.ok(org, 'test prompt names an organization');
		assert.match(
			r.reply,
			new RegExp(`don't have “${org}” in our directory`),
			'calls out the unknown org'
		);
		assert.ok(r.sources.length >= 3, 'still shows real sources');
		assert.ok(
			r.sources.every((s) => rows.some((x) => x.id === s.id)),
			'every source shown comes from the database'
		);
		assert.ok(
			!r.sources.some((s) => s.name.includes(org)),
			'the invented org is never a source card'
		);
		assert.doesNotMatch(r.reply, /https?:\/\//);
	});
}

for (const [i, message] of offTopic.entries()) {
	test(`off-topic ${i + 1}: "${message}"`, async () => {
		const before = calls;
		const r = await answerChat(deps, { message });
		assert.equal(r.kind, 'funding');
		if (r.kind !== 'funding') return;
		assert.equal(r.intent, 'need_details');
		assert.equal(r.sources.length, 0);
		assert.match(r.reply, /only able to help with paying for veterinary care/);
		assert.equal(calls, before, 'no LLM call for off-topic');
	});
}

for (const [i, message] of upset.entries()) {
	test(`upset owner ${i + 1}: "${message}"`, async () => {
		const r = await answerChat(deps, { message });
		assert.equal(r.kind, 'funding');
		if (r.kind !== 'funding') return;
		assert.ok(r.reply.startsWith(DISTRESS_PREFIX), `opens kindly: ${r.reply.slice(0, 80)}`);
		assert.equal(hasBannedPhrase(r.reply), null, 'no cost shaming');
		assert.ok(r.sources.length >= 3, 'still gets real help');
		assert.equal(r.intent, 'funding');
	});
}

test('a greeting gets a welcome, not the off-topic message, and no LLM call', async () => {
	const before = calls;
	const r = await answerChat(deps, { message: 'hi' });
	assert.equal(r.kind, 'funding');
	if (r.kind !== 'funding') return;
	assert.match(r.reply, /What is going on with your pet/);
	assert.equal(calls, before);
});

test('a 24-hour checklist answer rides along with the funding answer as a label', async () => {
	const r = await answerChat(deps, {
		message: 'My dog has been vomiting since yesterday, ZIP 23666',
		answers: { vomiting: true, breathing: false }
	});
	assert.equal(r.kind, 'funding');
	if (r.kind !== 'funding') return;
	assert.equal(r.urgency, 'WITHIN_24H');
	assert.ok(r.label);
});

test('checklist answers alone (no message) never stop to ask for the pet type', async () => {
	const r = await answerChat(deps, { message: '', answers: { vomiting: true, eating: false } });
	assert.equal(r.kind, 'funding');
	if (r.kind !== 'funding') return;
	assert.equal(r.intent, 'funding');
	assert.ok(r.sources.length >= 3);
});

test('a yes to an emergency checklist item is an emergency even with no text', async () => {
	const r = await answerChat(deps, { message: '', answers: { breathing: true } });
	assert.equal(r.kind, 'emergency');
});
