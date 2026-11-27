// Funding answers. "Look up first, then ask":
//   1. our code picks matching FundingSource rows from the database
//   2. the LLM only explains THOSE rows, in plain words
//   3. every link shown to the user comes from the database, never from the model
//
// TTL-303: the intake also reads pet type, estimated cost and ZIP from the
// message, asks for whatever is missing, and gives each source a one-line
// "why you may qualify" reason.
import { chat, type LlmConfig, LlmError } from './llm';
import type { FundingCategory, FundingScope } from '$lib/server/db/enums';
import { detectDistress, DISTRESS_PREFIX, unknownOrganizations } from './guards';

/** The FundingSource columns this feature reads (a subset of prisma/schema.prisma). */
export type FundingRow = {
	id: string;
	name: string;
	url: string;
	category: string; // FundingCategory
	scope: string; // FundingScope
	species: string; // "Dogs, Cats"
	conditions: string;
	eligibility: string;
	howToApply: string;
	maxAwardCents: number | null;
	maxAwardNote: string | null;
	incomeRestricted: boolean;
	vetMustApply: boolean;
	isVerified: boolean;
};

/** Minimal shape of the Prisma client we need, so tests can pass a fake. */
export type FundingDb = {
	fundingSource: { findMany(args: { where: object; take?: number }): Promise<FundingRow[]> };
};

export type FundingAsk = {
	question: string;
	species?: string | null; // "Dog" | "Cat" | ... from the pet or the message
	urgent?: boolean | null; // emergency/urgent care vs. care that can wait
	zip?: string | null; // 5-digit ZIP from the message or the pet's owner
	costCents?: number | null; // estimated bill, when the owner gave one
	/** false = answer with whatever we have, never stop to ask for details (symptom flow). */
	intake?: boolean;
};

// Grants and charities first (free money), then subsidised care, then things that must be repaid.
const CATEGORY_ORDER: FundingCategory[] = [
	'GRANT',
	'CHARITY',
	'SHELTER_PROGRAM',
	'LOW_COST_CARE',
	'PAYMENT_PLAN',
	'CREDIT',
	'INSURANCE'
];
const SCOPE_BONUS: Record<FundingScope, number> = { HAMPTON_ROADS: 2, VIRGINIA: 1, NATIONAL: 0 };
const REPAY: FundingCategory[] = ['PAYMENT_PLAN', 'CREDIT'];

const SPECIES_WORDS: Record<string, string> = {
	dog: 'dog',
	dogs: 'dog',
	puppy: 'dog',
	pup: 'dog',
	cat: 'cat',
	cats: 'cat',
	kitten: 'cat',
	kitty: 'cat',
	rabbit: 'rabbit',
	bunny: 'rabbit',
	bird: 'bird',
	parrot: 'bird',
	horse: 'horse'
};

export function detectSpecies(text: string, given?: string | null): string | null {
	if (given) return given.toLowerCase().replace(/s$/, '');
	for (const w of text.toLowerCase().match(/[a-z]+/g) ?? [])
		if (SPECIES_WORDS[w]) return SPECIES_WORDS[w];
	return null;
}

export function detectUrgency(text: string): boolean | null {
	const t = text.toLowerCase();
	if (/\b(emergency|urgent|er\b|right now|tonight|today|surgery now|critical|hit by)/.test(t))
		return true;
	if (
		/\b(dental|cleaning|wellness|checkup|check-up|vaccin|spay|neuter|chronic|ongoing|routine)/.test(
			t
		)
	)
		return false;
	return null;
}

/** First 5-digit ZIP in the text (US ZIPs run 00501–99950), or the one we were given. */
export function detectZip(text: string, given?: string | null): string | null {
	if (given && /^\d{5}$/.test(given)) return given;
	const m = text.match(/(?<![$\d,.])\b(\d{5})(?:-\d{4})?\b(?![\d,.]\d)/);
	return m ? m[1] : null;
}

/** "$3,000", "$850.50", "3000 dollars", "about 2k" → cents. */
export function detectCost(text: string, given?: number | null): number | null {
	if (given != null && given > 0) return given;
	const m =
		text.match(/\$\s?(\d[\d,]*)(?:\.(\d{1,2}))?\s*(k\b)?/i) ??
		text.match(/\b(\d[\d,]*)(?:\.(\d{1,2}))?\s*(k\b)?\s*(?:dollars|bucks|usd)\b/i);
	if (!m) return null;
	let dollars = Number(m[1].replaceAll(',', ''));
	if (!Number.isFinite(dollars)) return null;
	if (m[3]) dollars *= 1000;
	const cents = m[2] && !m[3] ? Number(m[2].padEnd(2, '0')) : 0;
	const total = Math.round(dollars) * 100 + cents;
	return total > 0 && total <= 100_000_000 ? total : null;
}

/** Which of our scopes a ZIP falls in. Hampton Roads is 233xx–236xx; the rest of Virginia is 201xx, 220xx–246xx. */
export function scopeForZip(zip: string | null): FundingScope | 'OUT_OF_STATE' | null {
	if (!zip) return null;
	const n = Number(zip.slice(0, 3));
	if (n >= 233 && n <= 236) return 'HAMPTON_ROADS';
	if (n === 201 || (n >= 220 && n <= 246)) return 'VIRGINIA';
	return 'OUT_OF_STATE';
}

/** Does a row's species text ("Dogs, Cats", "All pets") cover this species? */
export function speciesMatches(rowSpecies: string, species: string | null): boolean {
	if (!species) return true;
	const s = rowSpecies.toLowerCase();
	return s.includes('all') || s.includes('any') || s.includes(species.toLowerCase());
}

export function rankSources(rows: FundingRow[], ask: FundingAsk): FundingRow[] {
	const zipScope = scopeForZip(ask.zip ?? null);
	const score = (r: FundingRow) => {
		let s = 0;
		s -= CATEGORY_ORDER.indexOf(r.category as FundingCategory) * 10;
		s += SCOPE_BONUS[r.scope as FundingScope] ?? 0;
		s += r.isVerified ? 3 : 0;
		// Local programs only help people who live there (TTL-303: ZIP-aware ranking).
		if (zipScope === 'HAMPTON_ROADS' && r.scope === 'HAMPTON_ROADS') s += 4;
		if (zipScope === 'HAMPTON_ROADS' && r.scope === 'VIRGINIA') s += 2;
		if (zipScope === 'VIRGINIA' && r.scope === 'VIRGINIA') s += 3;
		if (zipScope === 'OUT_OF_STATE' && r.scope !== 'NATIONAL') s -= 100;
		// A grant capped far below the bill is still worth listing, just lower.
		if (ask.costCents && r.maxAwardCents != null && r.maxAwardCents * 4 < ask.costCents) s -= 3;
		const c = r.conditions.toLowerCase();
		if (ask.urgent === true && /\b(will not fund emergenc|non-urgent|can wait|not urgent)/.test(c))
			s -= 100;
		if (ask.urgent === true && /\b(urgent|emergency|life-threatening)/.test(c)) s += 4;
		if (
			ask.urgent === false &&
			/\b(does not cover (office exams|diagnostics|ongoing)|urgent, specific)/.test(c)
		)
			s -= 4;
		return s;
	};
	return [...rows].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

/** Every live source; retired ones are kept only for history. */
export function loadLiveSources(db: FundingDb): Promise<FundingRow[]> {
	return db.fundingSource.findMany({ where: { retiredAt: null }, take: 200 });
}

export function pickSources(rows: FundingRow[], ask: FundingAsk, limit = 6): FundingRow[] {
	const species = ask.species ?? null;
	return rankSources(
		rows.filter((r) => speciesMatches(r.species, species)),
		ask
	).slice(0, limit);
}

export async function findFundingSources(
	db: FundingDb,
	ask: FundingAsk,
	limit = 6
): Promise<FundingRow[]> {
	return pickSources(await loadLiveSources(db), ask, limit);
}

export const SYSTEM_PROMPT = `You are the Take The Lead helper. You help pet owners who are worried about paying a vet bill.
Rules:
- Be warm, calm and brief (under 160 words). Plain language, no jargon. Never shame anyone about money, and never suggest they should not have a pet.
- If the owner sounds upset or blames themselves, acknowledge that kindly in one sentence before anything else.
- Only talk about the numbered funding sources you are given. Never invent organizations, amounts, deadlines or links.
- If the owner names an organization that is not in the list, say you do not have it in our directory and do not describe it or guess what it offers.
- Refer to a source by its number in square brackets, like [1]. Do not write URLs or email addresses; the app shows the links.
- Mention grants and charities before payment plans or credit, and say plainly that a payment plan or credit card must be paid back.
- If a source says it does not fund emergencies and the owner is in an emergency, say so and point to the ones that do.
- Remind them to check each source's own site for current rules.
- You are not a vet. If the owner describes symptoms, tell them to contact a vet first.
- Only help with paying for or getting veterinary care. For anything else, say that is all you can help with.`;

const dollars = (cents: number) =>
	`$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function describeSource(r: FundingRow, n: number): string {
	const cap =
		r.maxAwardCents != null
			? `up to ${dollars(r.maxAwardCents)}`
			: (r.maxAwardNote ?? 'no published cap');
	const flags = [
		REPAY.includes(r.category as FundingCategory) ? 'must be repaid' : null,
		r.incomeRestricted ? 'income limits apply' : null,
		r.vetMustApply ? 'your vet applies, not you' : null,
		r.isVerified ? 'verified' : 'unverified'
	]
		.filter(Boolean)
		.join('; ');
	return `[${n}] ${r.name} (${r.category.toLowerCase().replaceAll('_', ' ')}, ${r.scope.toLowerCase().replaceAll('_', ' ')}; pets: ${r.species}; ${cap}; ${flags})
   Helps with: ${r.conditions}
   Who qualifies: ${r.eligibility}
   How to apply: ${r.howToApply}`;
}

const SCOPE_TEXT: Record<string, string> = {
	HAMPTON_ROADS: 'serves Hampton Roads',
	VIRGINIA: 'serves Virginia',
	NATIONAL: 'available nationwide'
};

/** One short line per source: why this owner may qualify (TTL-303). Built from data, never from the model. */
export function whyYouMayQualify(r: FundingRow, ask: FundingAsk): string {
	const parts: string[] = [];
	const sp = r.species.toLowerCase();
	if (ask.species && (sp.includes('all') || sp.includes('any'))) parts.push('covers all pets');
	else if (ask.species) parts.push(`covers ${ask.species}s`);
	parts.push(SCOPE_TEXT[r.scope] ?? r.scope.toLowerCase());
	const c = r.conditions.toLowerCase();
	if (ask.urgent === true && /\b(urgent|emergency|life-threatening)/.test(c))
		parts.push('funds urgent care');
	if (ask.urgent === false && /\b(ongoing|chronic|non-urgent)/.test(c))
		parts.push('funds non-urgent care');
	if (r.maxAwardCents != null) parts.push(`up to ${dollars(r.maxAwardCents)}`);
	if (REPAY.includes(r.category as FundingCategory)) parts.push('must be repaid');
	else parts.push('no repayment');
	if (r.incomeRestricted) parts.push('income limits apply');
	if (r.vetMustApply) parts.push('your vet applies for you');
	const s = parts.join(' · ');
	return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildMessages(ask: FundingAsk, sources: FundingRow[]) {
	const list = sources.map((r, i) => describeSource(r, i + 1)).join('\n');
	const context = [
		ask.species ? `Pet: ${ask.species}.` : null,
		ask.zip ? `Owner's ZIP: ${ask.zip}.` : null,
		ask.costCents ? `Estimated bill: ${dollars(ask.costCents)}.` : null,
		ask.urgent === true ? 'The owner says this is urgent or an emergency.' : null,
		ask.urgent === false ? 'The care is not urgent.' : null
	]
		.filter(Boolean)
		.join(' ');
	return [
		{ role: 'system' as const, content: SYSTEM_PROMPT },
		{
			role: 'user' as const,
			content: `Funding sources from our database:\n${list || '(none found)'}\n\n${context}\nOwner's question: ${ask.question}`
		}
	];
}

export function fallbackReply(sources: FundingRow[]): string {
	if (!sources.length)
		return "I couldn't find a matching funding source yet. Please check our Resources page, and ask your vet about payment plans.";
	return `Here are some places that may help with your vet bill: ${sources.map((s, i) => `[${i + 1}] ${s.name}`).join(', ')}. Open each one to check its current rules.`;
}

export type MissingDetail = 'pet type' | 'what the care is for' | 'estimated cost' | 'ZIP code';

/** What we still need to give a good answer. Order matters: it is the order we ask in. */
export function missingDetails(ask: FundingAsk): MissingDetail[] {
	const out: MissingDetail[] = [];
	if (!ask.species) out.push('pet type');
	if (
		ask.urgent == null &&
		!/\b(surgery|treatment|diagnos|cancer|broken|fracture|infection|teeth|tumou?r|injur|sick|ill|disease|condition)\w*/i.test(
			ask.question
		)
	)
		out.push('what the care is for');
	if (!ask.costCents) out.push('estimated cost');
	if (!ask.zip) out.push('ZIP code');
	return out;
}

export function intakeReply(missing: MissingDetail[]): string {
	const list =
		missing.length === 1
			? missing[0]
			: `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;
	return `I can help with that. To find the best matches, tell me your ${list} — for example: "My dog needs surgery for a broken leg, about $2,500, ZIP 23666."`;
}

export type FundingAnswer = {
	reply: string;
	aiUsed: boolean;
	/** True only when the LLM was needed (sources.length > 0) and fell back on LlmError. */
	aiFallback: boolean;
	/** 'need_details' = we asked for more before searching (no sources yet). */
	intent: 'funding' | 'need_details';
	/** Details we would still like, even when we did answer. */
	needs: MissingDetail[];
	sources: {
		number: number;
		id: string;
		name: string;
		url: string;
		category: string;
		scope: string;
		mustRepay: boolean;
		verified: boolean;
		reason: string;
	}[];
};

export async function answerFundingQuestion(
	db: FundingDb,
	llm: LlmConfig,
	ask: FundingAsk
): Promise<FundingAnswer> {
	const resolved: FundingAsk = {
		question: ask.question,
		species: detectSpecies(ask.question, ask.species),
		urgent: ask.urgent ?? detectUrgency(ask.question),
		zip: detectZip(ask.question, ask.zip),
		costCents: detectCost(ask.question, ask.costCents),
		intake: ask.intake !== false
	};
	const needs = missingDetails(resolved);
	const distressed = detectDistress(ask.question);

	// Ask for the pet type before searching: without it we would list every source for every animal.
	if (resolved.intake && !resolved.species) {
		return {
			reply: (distressed ? DISTRESS_PREFIX + ' ' : '') + intakeReply(needs),
			aiUsed: false,
			aiFallback: false,
			intent: 'need_details',
			needs,
			sources: []
		};
	}

	const all = await loadLiveSources(db);
	const sources = pickSources(all, resolved);
	let reply: string;
	let aiUsed = false;
	let aiFallback = false;
	if (sources.length) {
		try {
			reply = await chat(llm, buildMessages(resolved, sources));
			reply = reply
				.replace(/https?:\/\/\S+|\S+@\S+\.\S+/g, '')
				.replace(/[ \t]{2,}/g, ' ')
				.trim();
			aiUsed = true;
		} catch (e) {
			if (!(e instanceof LlmError)) throw e;
			console.error('[ai] LLM fallback:', e.message);
			reply = fallbackReply(sources);
			aiFallback = true;
		}
	} else {
		reply = fallbackReply(sources);
	}

	// TTL-304 guards, applied to the AI text and the fallback alike.
	// Compare against the whole directory, not just the six shown, so a real source we
	// filtered out (wrong species, out of area) is never called "unknown".
	const unknown = unknownOrganizations(ask.question, all);
	if (unknown.length) {
		const names = unknown.map((n) => `“${n}”`).join(' or ');
		reply += ` I don't have ${names} in our directory, so I can't confirm what it offers. The sources listed here are ones we have checked.`;
	}
	if (distressed && !reply.startsWith(DISTRESS_PREFIX)) reply = `${DISTRESS_PREFIX} ${reply}`;
	if (needs.length && sources.length) {
		const extra = needs.filter((n) => n !== 'what the care is for');
		if (extra.length) reply += ` If you share your ${extra.join(' and ')}, I can narrow this down.`;
	}

	return {
		reply,
		aiUsed,
		aiFallback,
		intent: 'funding',
		needs,
		sources: sources.map((s, i) => ({
			number: i + 1,
			id: s.id,
			name: s.name,
			url: s.url,
			category: s.category,
			scope: s.scope,
			mustRepay: REPAY.includes(s.category as FundingCategory),
			verified: s.isVerified,
			reason: whyYouMayQualify(s, resolved)
		}))
	};
}
