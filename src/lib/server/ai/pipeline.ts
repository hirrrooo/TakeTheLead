// TTL-303 / TTL-304 — the whole chat decision in one testable function.
// /api/chat is a thin wrapper around answerChat(); tests call answerChat() directly.
//
// Order matters:
//   1. safety rules (TTL-204) — emergency wins, no AI involved
//   2. greeting / off-topic guard (TTL-304) — no AI involved
//   3. funding answer (TTL-203/303) — database first, AI explains, guards clean up
import type { LlmConfig } from './llm';
import { answerFundingQuestion, type FundingAnswer, type FundingDb } from './funding';
import { GREETING_REPLY, isGreeting, isOffTopic, OFF_TOPIC_REPLY } from './guards';
import { checkSafety, type SymptomAnswers, URGENCY_LABEL, type Urgency } from './safety';

export type ChatInput = {
	message: string;
	answers?: SymptomAnswers;
	species?: string | null;
	urgent?: boolean | null;
	zip?: string | null;
};

export type ChatReply =
	| {
			kind: 'emergency';
			urgency: 'EMERGENCY';
			label: string;
			reply: string;
			reasons: string[];
	  }
	| ({
			kind: 'funding';
			urgency?: Urgency;
			label?: string;
	  } & FundingAnswer);

const DEFAULT_QUESTION = 'My pet is unwell and I am worried about the cost of care.';

export async function answerChat(
	deps: { db: FundingDb; llm: LlmConfig },
	input: ChatInput
): Promise<ChatReply> {
	const message = input.message.trim();
	const answers = input.answers ?? {};

	// 1. Safety first — rules only, so this works even when the LLM is down.
	const safety = checkSafety(message, answers);
	if (safety.urgency === 'EMERGENCY') {
		return {
			kind: 'emergency',
			urgency: 'EMERGENCY',
			label: URGENCY_LABEL.EMERGENCY,
			reply: safety.emergencyMessage ?? '',
			reasons: safety.reasons
		};
	}
	const urgencyFields = safety.urgency
		? { urgency: safety.urgency, label: URGENCY_LABEL[safety.urgency] }
		: {};

	// 2. Stay on topic — and do not spend an LLM call on "hi".
	const fromChecklist = Object.keys(answers).length > 0;
	if (message && !fromChecklist) {
		const canned = isGreeting(message)
			? GREETING_REPLY
			: isOffTopic(message)
				? OFF_TOPIC_REPLY
				: null;
		if (canned) {
			return {
				kind: 'funding',
				reply: canned,
				aiUsed: false,
				aiFallback: false,
				intent: 'need_details',
				needs: ['pet type', 'what the care is for', 'estimated cost', 'ZIP code'],
				sources: [],
				...urgencyFields
			};
		}
	}

	// 3. Funding answer. A rule-assigned urgency rides along and is never lowered.
	const urgent =
		typeof input.urgent === 'boolean'
			? input.urgent
			: safety.urgency === 'WITHIN_24H'
				? true
				: null;
	const result = await answerFundingQuestion(deps.db, deps.llm, {
		question: message || DEFAULT_QUESTION,
		species: input.species ?? null,
		urgent,
		zip: input.zip ?? null,
		// After the symptom checklist we answer with what we have rather than asking again.
		intake: !fromChecklist
	});
	return { kind: 'funding', ...result, ...urgencyFields };
}
