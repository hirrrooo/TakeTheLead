//POST /api/chat
// body: { message: string, species?: string, urgent?: boolean }
// reply: { kind: 'funding', reply, aiUsed, sources: [{ number, name, url, ... }] }
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { answerFundingQuestion } from '$lib/server/ai/funding';
import { allow } from '$lib/server/ai/rateLimit';
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
	} | null;
	const message = typeof body?.message === 'string' ? body.message.trim() : '';
	if (!message) error(400, 'message is required');
	if (message.length > 1000) error(400, 'message is too long (1000 characters max)');

	// TTL-204 (care guidance safety rules) plugs in here, BEFORE the funding answer:
	//   const safety = checkSafety(message, body?.answers); if (safety.urgency === 'EMERGENCY') return json({ kind: 'emergency', ... });

	const result = await answerFundingQuestion(db, llm, {
		question: message,
		species: typeof body?.species === 'string' ? body.species : null,
		urgent: typeof body?.urgent === 'boolean' ? body.urgent : null
	});
	return json({ kind: 'funding', ...result });
};
