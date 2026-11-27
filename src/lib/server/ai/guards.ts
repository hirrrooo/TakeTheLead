// TTL-304 — rule-based guards that run around the LLM.
// Everything here is deterministic so it is testable and works when the LLM is down.

/** Words that mean the message is about pets, vets or paying for care. */
const ON_TOPIC =
	/\b(pet|pets|dog|dogs|puppy|pup|cat|cats|kitten|kitty|rabbit|bunny|bird|parrot|horse|vet|vets|veterinar\w*|animal|bill|bills|cost|costs|pay|paying|payment|afford|money|broke|grant|grants|charity|charities|fund|funds|funding|insurance|credit|loan|surgery|treatment|medication|meds|sick|ill|injur\w*|emergency|er\b|hospital|clinic|symptom\w*|vomit\w*|diarrh\w*|limp\w*|seiz\w*|breath\w*|bleed\w*|eat\w*|drink\w*|pee|urinat\w*|poison\w*|campaign|donat\w*|fundrais\w*)\b/i;

/** Greetings and tiny messages get a welcome, not a brush-off. */
const GREETING =
	/^\s*(hi|hello|hey|yo|good (morning|afternoon|evening)|thanks?|thank you|ok|okay)\b[\s!.?]*$/i;

export function isGreeting(text: string): boolean {
	return GREETING.test(text);
}

/** True when nothing in the message is about pets, vets or money for care. */
export function isOffTopic(text: string): boolean {
	if (!text.trim() || isGreeting(text)) return false;
	return !ON_TOPIC.test(text);
}

export const GREETING_REPLY =
	'Hi! I can help you find ways to pay for vet care, or help you decide how soon your pet should see a vet. What is going on with your pet?';

export const OFF_TOPIC_REPLY =
	"I'm only able to help with paying for veterinary care and deciding how soon a pet should see a vet. If your pet needs care, tell me the pet type, what is wrong, the estimated cost and your ZIP code, and I'll look for help.";

/** Owner is upset, blaming themselves, or weighing giving the pet up. */
const DISTRESS =
	/\b(can'?t|cannot|can not|couldn'?t) afford\b|\bno money\b|\bbroke\b|\b(terrible|bad|awful|horrible|worst) (owner|person|pet parent|mom|dad)\b|\bmy fault\b|\bguilty\b|\bashamed\b|\bfailing (him|her|them)\b|\bcrying\b|\bgiv(e|ing) (him|her|them|up)\b|\bsurrender\w*|\bput (him|her|them) (down|to sleep)\b|\beuthan\w*|\bhopeless\b|\bdesperate\b/i;

export function detectDistress(text: string): boolean {
	return DISTRESS.test(text);
}

export const DISTRESS_PREFIX =
	"I'm sorry you're going through this. Looking for help is exactly the right thing to do, and many caring owners are in the same spot.";

/**
 * Organization-looking names in the owner's message, e.g. "Golden Paws Emergency Grant".
 * Two or more capitalized words ending in a funding-type word.
 */
const ORG_NAME =
	/\b((?:[A-Z][\w'&-]*\s+){1,5}(?:Fund|Funds|Foundation|Grant|Grants|Charity|Program|Programme|Society|Trust|Rescue|Relief|Angels|Network|Alliance))\b/g;

export function mentionedOrganizations(text: string): string[] {
	const out = new Set<string>();
	for (const m of text.matchAll(ORG_NAME)) {
		const name = m[1].replace(/\s+/g, ' ').trim();
		// Skip sentence starts like "The Pet" that are really just capitalised words.
		if (name.split(' ').length >= 2) out.add(name);
	}
	return [...out];
}

const norm = (s: string) =>
	s
		.toLowerCase()
		.replace(/^the\s+/, '')
		.replace(/[^a-z0-9 ]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

/** Organizations the owner named that are NOT in the sources we are about to show. */
export function unknownOrganizations(text: string, sources: { name: string }[]): string[] {
	const known = sources.map((s) => norm(s.name));
	return mentionedOrganizations(text).filter((name) => {
		const n = norm(name);
		return !known.some((k) => k.includes(n) || n.includes(k));
	});
}

/** Phrases a kind helper must never say. Used by the tests and the live prompt script. */
export const BANNED_PHRASES = [
	/should(n'?t| not) have (gotten|adopted|bought)/i,
	/irresponsible/i,
	/your fault/i,
	/can'?t afford (a|to have a|to own a) pet/i,
	/shouldn'?t own/i,
	/if you can'?t afford/i
];

export function hasBannedPhrase(text: string): string | null {
	for (const p of BANNED_PHRASES) {
		const m = text.match(p);
		if (m) return m[0];
	}
	return null;
}
