// TTL-203 + TTL-204 — POST /api/chat
// body: { message: string, species?: string, urgent?: boolean, answers?: { breathing?: boolean, ... } }
// reply: { kind: 'emergency', urgency, label, reply, reasons }
//     or { kind: 'funding', reply, aiUsed, sources: [...], urgency?, label? }
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { answerFundingQuestion } from '$lib/server/ai/funding';
import { allow } from '$lib/server/ai/rateLimit';
import { checkSafety, parseAnswers, URGENCY_LABEL } from '$lib/server/ai/safety';
import type { RequestHandler } from './$types';

const llm = {
	baseUrl: env.LLM_BASE_URL ?? '',
	apiKey: env.LLM_API_KEY,
	model: env.LLM_MODEL ?? ''
};

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	if (!allow(getClientAddress())) error(429, 'Too many messages. Please wait a few minutes.');
	const body = (await request.json().catch(() => null)) as {
		message?: unknown;
		species?: unknown;
		urgent?: unknown;
		answers?: unknown;
	} | null;
	const message = typeof body?.message === 'string' ? body.message.trim() : '';
	const answers = parseAnswers(body?.answers);
	if (!message && Object.keys(answers).length === 0) error(400, 'message is required');
	if (message.length > 1000) error(400, 'message is too long (1000 characters max)');

	// 1. Safety first (TTL-204) — rules only, no AI, so this works even when the LLM is down.
	const safety = checkSafety(message, answers);
	if (safety.urgency === 'EMERGENCY') {
		return json({
			kind: 'emergency',
			urgency: safety.urgency,
			label: URGENCY_LABEL.EMERGENCY,
			reply: safety.emergencyMessage,
			reasons: safety.reasons
		});
	}

	// 2. Funding answer (TTL-203). A rule-assigned urgency rides along and is never lowered.
	const urgent =
		typeof body?.urgent === 'boolean' ? body.urgent : safety.urgency === 'WITHIN_24H' ? true : null;
	const result = await answerFundingQuestion(db, llm, {
		question: message || 'My pet is unwell and I am worried about the cost of care.',
		species: typeof body?.species === 'string' ? body.species : null,
		urgent
	});
	return json({
		kind: 'funding',
		...result,
		...(safety.urgency ? { urgency: safety.urgency, label: URGENCY_LABEL[safety.urgency] } : {})
	});
};
