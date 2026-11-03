// TTL-204 — Care guidance safety rules.
// Runs BEFORE the AI and needs no AI at all, so emergencies are caught even if the LLM is down.
// Rule of thumb: when in doubt, escalate. A false alarm costs a phone call; a miss can cost a pet.

export type Urgency = 'EMERGENCY' | 'WITHIN_24H' | 'BOOK_APPOINTMENT' | 'MONITOR';

export const URGENCY_LABEL: Record<Urgency, string> = {
	EMERGENCY: 'Go to an emergency vet now',
	WITHIN_24H: 'See a vet within 24 hours',
	BOOK_APPOINTMENT: 'Book a regular vet appointment',
	MONITOR: 'Watch closely at home'
};

/** Yes/no checklist the chat window asks first (TTL-205 renders these as buttons). */
export const SYMPTOM_QUESTIONS = [
	{
		id: 'breathing',
		text: 'Is your pet having trouble breathing, choking, or breathing with its mouth open (cats)?',
		urgency: 'EMERGENCY'
	},
	{
		id: 'collapse',
		text: 'Has your pet collapsed, fainted, or is it unable to stand?',
		urgency: 'EMERGENCY'
	},
	{
		id: 'seizure',
		text: 'Is your pet having a seizure, or had more than one today?',
		urgency: 'EMERGENCY'
	},
	{
		id: 'toxin',
		text: 'Might your pet have eaten something poisonous (chocolate, xylitol/sugar-free gum, grapes, lilies, antifreeze, rat poison, medicine)?',
		urgency: 'EMERGENCY'
	},
	{
		id: 'bloat',
		text: 'Is the belly swollen or hard, or is your pet trying to vomit with nothing coming up?',
		urgency: 'EMERGENCY'
	},
	{
		id: 'bleeding',
		text: 'Is there bleeding that will not stop, or was your pet hit by a car or badly hurt?',
		urgency: 'EMERGENCY'
	},
	{
		id: 'urine',
		text: 'Is your pet straining to pee with little or nothing coming out (especially male cats)?',
		urgency: 'EMERGENCY'
	},
	{ id: 'gums', text: 'Are the gums pale, white, blue, or gray?', urgency: 'EMERGENCY' },
	{
		id: 'vomiting',
		text: 'Has your pet vomited or had diarrhea several times today, or is there blood in it?',
		urgency: 'WITHIN_24H'
	},
	{
		id: 'eating',
		text: 'Has your pet refused food for more than a day, or seemed very tired and weak?',
		urgency: 'WITHIN_24H'
	},
	{
		id: 'pain',
		text: 'Is your pet crying out, hiding, or not putting weight on a leg?',
		urgency: 'WITHIN_24H'
	}
] as const satisfies readonly { id: string; text: string; urgency: Urgency }[];

export type SymptomId = (typeof SYMPTOM_QUESTIONS)[number]['id'];
export type SymptomAnswers = Partial<Record<SymptomId, boolean>>;

/** Free-text red flags. Matching is deliberately broad: any hit escalates. */
const RED_FLAGS: { pattern: RegExp; reason: string }[] = [
	{
		pattern:
			/\b(can'?t|cannot|not|isn'?t|trouble|hard|struggl\w*|difficult\w*)\s+(to\s+)?breath\w*|\bchok\w*|\bgasp\w*|\bopen[- ]mouth(ed)? breath\w*|\bblue (gums|tongue)\b/i,
		reason: 'trouble breathing'
	},
	{
		pattern:
			/\bcollaps\w*|\bfaint\w*|\bunconscious\b|\bunresponsive\b|\b(can'?t|cannot|won'?t|unable to) (stand|get up|walk)\b/i,
		reason: 'collapse or unable to stand'
	},
	{ pattern: /\bseiz\w*|\bconvuls\w*|\bfitting\b/i, reason: 'seizure' },
	{
		pattern:
			/\b(ate|eaten|swallow\w*|licked|chewed|got into)\b.*\b(chocolate|xylitol|sugar[- ]free gum|grapes?|raisins?|lil(y|ies)|antifreeze|rat poison|rodenticide|bleach|ibuprofen|tylenol|acetaminophen|advil|medication|pills?|marijuana|edibles?|onions?|garlic)\b|\bpoison\w*|\btoxic\b/i,
		reason: 'possible poisoning'
	},
	{
		pattern:
			/\b(swollen|bloated|hard|distended) (belly|stomach|abdomen)\b|\bbloat\b|\b(retching|dry heav\w*|trying to (vomit|throw up))\b/i,
		reason: 'possible bloat'
	},
	{
		pattern:
			/\b(won'?t|will not|doesn'?t|does not) stop bleeding\b|\bbleeding (a lot|heavily|badly)\b|\bhit by a (car|truck|vehicle)\b|\bheavy bleeding\b/i,
		reason: 'serious bleeding or injury'
	},
	{
		pattern:
			/\bstrain\w* to (pee|urinate)\b|\b(can'?t|cannot|isn'?t able to|not able to) (pee|urinate)\b|\bno (pee|urine)\b/i,
		reason: 'unable to urinate'
	},
	{
		pattern:
			/\b(pale|white|blue|gr[ae]y)\b.{0,20}\bgums?\b|\bgums?\b.{0,20}\b(pale|white|blue|gr[ae]y)\b/i,
		reason: 'abnormal gum color'
	},
	{ pattern: /\bheat ?stroke\b|\boverheat\w*/i, reason: 'possible heatstroke' }
];

export type SafetyResult = {
	/** null = no rule fired; the AI may help, but it must never downgrade a rule result */
	urgency: Urgency | null;
	reasons: string[];
	emergencyMessage?: string;
};

export const EMERGENCY_MESSAGE =
	'This could be an emergency. Please go to an emergency vet now, or call one on the way. ' +
	'If your pet may have been poisoned, you can also call the ASPCA Animal Poison Control Center at (888) 426-4435 (a fee may apply). ' +
	'Take The Lead can help with costs after your pet is safe.';

const RANK: Urgency[] = ['EMERGENCY', 'WITHIN_24H', 'BOOK_APPOINTMENT', 'MONITOR'];
const worst = (a: Urgency | null, b: Urgency | null): Urgency | null =>
	a === null ? b : b === null ? a : (RANK[Math.min(RANK.indexOf(a), RANK.indexOf(b))] ?? a);

/** Evaluate free text and checklist answers. Never calls the LLM. */
export function checkSafety(text: string, answers: SymptomAnswers = {}): SafetyResult {
	let urgency: Urgency | null = null;
	const reasons: string[] = [];

	for (const flag of RED_FLAGS) {
		if (flag.pattern.test(text)) {
			urgency = 'EMERGENCY';
			reasons.push(flag.reason);
		}
	}
	for (const q of SYMPTOM_QUESTIONS) {
		if (answers[q.id]) {
			urgency = worst(urgency, q.urgency);
			reasons.push(q.id);
		}
	}
	return urgency === 'EMERGENCY'
		? { urgency, reasons, emergencyMessage: EMERGENCY_MESSAGE }
		: { urgency, reasons };
}

/** Accept only known checklist ids with boolean values from an untrusted request body. */
export function parseAnswers(input: unknown): SymptomAnswers {
	const out: SymptomAnswers = {};
	if (!input || typeof input !== 'object') return out;
	for (const q of SYMPTOM_QUESTIONS) {
		const v = (input as Record<string, unknown>)[q.id];
		if (typeof v === 'boolean') out[q.id] = v;
	}
	return out;
}