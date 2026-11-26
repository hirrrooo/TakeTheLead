// Funding answers. "Look up first, then ask":
//   1. our code picks matching FundingSource rows from the database
//   2. the LLM only explains THOSE rows, in plain words
//   3. every link shown to the user comes from the database, never from the model
import { chat, type LlmConfig, LlmError } from './llm';
import type { FundingCategory, FundingScope } from '$lib/server/db/enums';

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

/** Does a row's species text ("Dogs, Cats", "All pets") cover this species? */
export function speciesMatches(rowSpecies: string, species: string | null): boolean {
	if (!species) return true;
	const s = rowSpecies.toLowerCase();
	return s.includes('all') || s.includes('any') || s.includes(species.toLowerCase());
}

export function rankSources(rows: FundingRow[], ask: FundingAsk): FundingRow[] {
	const score = (r: FundingRow) => {
		let s = 0;
		s -= CATEGORY_ORDER.indexOf(r.category as FundingCategory) * 10;
		s += SCOPE_BONUS[r.scope as FundingScope] ?? 0;
		s += r.isVerified ? 3 : 0;
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

export async function findFundingSources(
	db: FundingDb,
	ask: FundingAsk,
	limit = 6
): Promise<FundingRow[]> {
	const rows = await db.fundingSource.findMany({ where: { retiredAt: null }, take: 200 });
	const species = ask.species ?? null;
	return rankSources(
		rows.filter((r) => speciesMatches(r.species, species)),
		ask
	).slice(0, limit);
}

export const SYSTEM_PROMPT = `You are the Take The Lead helper. You help pet owners who are worried about paying a vet bill.
Rules:
- Be warm, calm and brief (under 160 words). Plain language, no jargon. Never shame anyone about money.
- Only talk about the numbered funding sources you are given. Never invent organizations, amounts, deadlines or links.
- Refer to a source by its number in square brackets, like [1]. Do not write URLs or email addresses; the app shows the links.
- Mention grants and charities before payment plans or credit, and say plainly that a payment plan or credit card must be paid back.
- If a source says it does not fund emergencies and the owner is in an emergency, say so and point to the ones that do.
- Remind them to check each source's own site for current rules.
- You are not a vet. If the owner describes symptoms, tell them to contact a vet first.`;

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

export function buildMessages(ask: FundingAsk, sources: FundingRow[]) {
	const list = sources.map((r, i) => describeSource(r, i + 1)).join('\n');
	const context = [
		ask.species ? `Pet: ${ask.species}.` : null,
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

export type FundingAnswer = {
	reply: string;
	aiUsed: boolean;
	sources: {
		number: number;
		id: string;
		name: string;
		url: string;
		category: string;
		scope: string;
		mustRepay: boolean;
		verified: boolean;
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
		urgent: ask.urgent ?? detectUrgency(ask.question)
	};
	const sources = await findFundingSources(db, resolved);
	let reply: string;
	let aiUsed = true;
	try {
		reply = sources.length
			? await chat(llm, buildMessages(resolved, sources))
			: fallbackReply(sources);
		reply = reply
			.replace(/https?:\/\/\S+|\S+@\S+\.\S+/g, '')
			.replace(/[ \t]{2,}/g, ' ')
			.trim();
	} catch (e) {
		if (!(e instanceof LlmError)) throw e;
		reply = fallbackReply(sources);
		aiUsed = false;
	}
	return {
		reply,
		aiUsed,
		sources: sources.map((s, i) => ({
			number: i + 1,
			id: s.id,
			name: s.name,
			url: s.url,
			category: s.category,
			scope: s.scope,
			mustRepay: REPAY.includes(s.category as FundingCategory),
			verified: s.isVerified
		}))
	};
}
