// TTL-203 + TTL-204 + TTL-303 + TTL-304 — POST /api/chat
// body:  { message: string, species?: string, urgent?: boolean, zip?: string,
//          answers?: { breathing?: boolean, ... } }
// reply: { kind: 'emergency', urgency, label, reply, reasons }
//     or { kind: 'funding', intent, needs, reply, aiUsed, sources: [...], urgency?, label? }
// The decision itself lives in $lib/server/ai/pipeline so the tests can run it without SvelteKit.
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { answerChat } from '$lib/server/ai/pipeline';
import { allow } from '$lib/server/ai/rateLimit';
import { parseAnswers } from '$lib/server/ai/safety';
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
		zip?: unknown;
		answers?: unknown;
	} | null;
	const message = typeof body?.message === 'string' ? body.message.trim() : '';
	const answers = parseAnswers(body?.answers);
	if (!message && Object.keys(answers).length === 0) error(400, 'message is required');
	if (message.length > 1000) error(400, 'message is too long (1000 characters max)');

	const reply = await answerChat(
		{ db, llm },
		{
			message,
			answers,
			species: typeof body?.species === 'string' ? body.species : null,
			urgent: typeof body?.urgent === 'boolean' ? body.urgent : null,
			zip: typeof body?.zip === 'string' ? body.zip : null
		}
	);
	return json(reply);
};
