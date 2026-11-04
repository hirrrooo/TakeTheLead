// TTL-205 — GET /api/chat/questions
// The yes/no symptom checklist from TTL-204, for the chat window to ask one at a time.
import { json } from '@sveltejs/kit';
import { SYMPTOM_QUESTIONS } from '$lib/server/ai/safety';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => json(SYMPTOM_QUESTIONS);
