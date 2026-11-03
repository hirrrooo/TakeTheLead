// Run:  npx tsx --test tests/safety.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSafety, parseAnswers, SYMPTOM_QUESTIONS } from '../src/lib/server/ai/safety';

const emergencies = [
	'my dog is having trouble breathing',
	"my cat collapsed and won't get up",
	'she had a seizure an hour ago',
	'he ate a whole bar of dark chocolate',
	'my dog got into the rat poison',
	'his belly is swollen and he keeps trying to vomit',
	'my cat is straining to pee and nothing comes out',
	'her gums look pale',
	'he was hit by a car',
	'my puppy is choking',
	'I think she has heatstroke'
];
for (const text of emergencies) {
	test(`EMERGENCY: ${text}`, () => {
		const r = checkSafety(text);
		assert.equal(r.urgency, 'EMERGENCY');
		assert.ok(r.emergencyMessage);
		assert.ok(r.reasons.length >= 1);
	});
}

test('checklist answer escalates even with calm text', () => {
	assert.equal(checkSafety('just wondering about costs', { bloat: true }).urgency, 'EMERGENCY');
});

test('24h checklist answer', () => {
	assert.equal(checkSafety('help with costs', { vomiting: true }).urgency, 'WITHIN_24H');
});

test('worst answer wins', () => {
	assert.equal(checkSafety('', { vomiting: true, seizure: true }).urgency, 'EMERGENCY');
});

test('plain funding question triggers nothing', () => {
	assert.equal(checkSafety("how can I pay for my dog's surgery?").urgency, null);
	assert.equal(checkSafety('my cat needs a dental cleaning').urgency, null);
});

test('parseAnswers keeps only known ids with booleans', () => {
	const a = parseAnswers({ bloat: true, vomiting: 'yes', hacker: true, seizure: false });
	assert.deepEqual(a, { bloat: true, seizure: false });
	assert.deepEqual(parseAnswers(null), {});
	assert.deepEqual(parseAnswers('x'), {});
});

test('every checklist question has an id, text and urgency', () => {
	for (const q of SYMPTOM_QUESTIONS) {
		assert.ok(q.id && q.text.endsWith('?'));
		assert.ok(['EMERGENCY', 'WITHIN_24H'].includes(q.urgency));
	}
});
