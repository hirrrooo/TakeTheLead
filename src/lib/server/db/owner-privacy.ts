/**
 * Pure owner-privacy projection and location sanitization (TTL-310).
 *
 * Public pages show only the owner's first name (or anonymous display alias)
 * and city — never last names, emails, street addresses, or ZIP codes.
 * No database or framework imports so unit tests run without Prisma.
 */

export const DEFAULT_PUBLIC_OWNER_NAME = 'A Take the Lead member';

export interface PublicOwnerInput {
	ownerName?: string | null;
	isOwnerAnonymous?: boolean;
	ownerDisplayName?: string | null;
	ownerCity?: string | null;
}

export interface PublicOwnerProjection {
	ownerName: string;
	ownerCity: string | null;
}

const STREET_PATTERN =
	/\b\d{1,5}\s+[A-Za-z]|\bp\.?\s*o\.?\s*box\b|\b\d{5}(?:-\d{4})?\b|\b(?:apt|apartment|suite|ste|unit|bldg|building|lot|trlr|trailer)\b\s*#?\s*\w*\d|#\s*\d/i;

const TRAILING_STREET_SUFFIX =
	/\s+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|cir|circle|pkwy|parkway|hwy|highway|ter|terrace)\.?$/i;

export function extractFirstName(fullName: string | null | undefined): string | null {
	const collapsed = String(fullName ?? '')
		.trim()
		.replace(/\s+/g, ' ');
	if (!collapsed || collapsed.includes('@')) return null;

	const first = collapsed.split(' ')[0];
	return first || null;
}

export function looksLikeStreetAddress(value: string): boolean {
	const collapsed = value.trim().replace(/\s+/g, ' ');
	if (!collapsed) return false;
	if (collapsed.includes('@')) return true;
	if (/^\d/.test(collapsed)) return true;
	if (STREET_PATTERN.test(collapsed)) return true;

	const beforeComma = collapsed.split(',')[0]?.trim() ?? collapsed;
	if (TRAILING_STREET_SUFFIX.test(beforeComma)) return true;

	return false;
}

export function sanitizePublicCity(rawCity: string | null | undefined): string | null {
	const collapsed = String(rawCity ?? '')
		.trim()
		.replace(/\s+/g, ' ');
	if (!collapsed || looksLikeStreetAddress(collapsed)) return null;

	const cityOnly = collapsed.split(',')[0]?.trim() ?? '';
	if (!cityOnly || looksLikeStreetAddress(cityOnly)) return null;
	return cityOnly;
}

export function projectSearchableOwner(input: PublicOwnerInput): {
	ownerName: string | null;
	ownerCity: string | null;
} {
	const ownerCity = sanitizePublicCity(input.ownerCity) ?? null;

	if (input.isOwnerAnonymous) {
		const alias = String(input.ownerDisplayName ?? '')
			.trim()
			.replace(/\s+/g, ' ');
		return {
			ownerName: alias && !alias.includes('@') && !looksLikeStreetAddress(alias) ? alias : null,
			ownerCity
		};
	}

	return {
		ownerName: extractFirstName(input.ownerName),
		ownerCity
	};
}

export function projectPublicOwner(input: PublicOwnerInput): PublicOwnerProjection {
	const searchable = projectSearchableOwner(input);
	return {
		ownerName:
			searchable.ownerName ?? (input.isOwnerAnonymous ? 'Anonymous' : DEFAULT_PUBLIC_OWNER_NAME),
		ownerCity: searchable.ownerCity
	};
}
export function formatPublicOwnerLabel(owner: PublicOwnerProjection): string {
	return owner.ownerCity ? `${owner.ownerName} · ${owner.ownerCity}` : owner.ownerName;
}

export function stripOwnerRelations<T extends { owner?: unknown }>(row: T): Omit<T, 'owner'> {
	const copy = { ...row };
	delete copy.owner;
	return copy;
}
