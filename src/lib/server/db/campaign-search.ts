/**
 * Pure helpers for the campaign search box. No database imports, so they are
 * unit-tested without a Prisma client.
 */

export const MAX_SEARCH_LENGTH = 80;
export const MAX_SEARCH_TERMS = 6;

/**
 * Turns raw `?q=` input into a trimmed, whitespace-collapsed string.
 * LIKE wildcards (% _) and backslashes are removed so a search for "100%" or "_"
 * cannot match everything.
 */
export function normalizeSearchQuery(raw: string | null | undefined): string {
	return String(raw ?? '')
		.replace(/[%_\\]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, MAX_SEARCH_LENGTH)
		.trim();
}

/** Space-separated words; a campaign must match every word (in any searched field). */
export function searchTerms(query: string): string[] {
	const unique = new Set(
		normalizeSearchQuery(query)
			.split(' ')
			.filter((term) => term.length > 0)
	);
	return [...unique].slice(0, MAX_SEARCH_TERMS);
}
