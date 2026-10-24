/**
 * Placeholder campaign data for the dashboard.
 *
 * Everything here is stand-in data: swap these helpers for Prisma queries
 * (`src/lib/server/db.ts`) once the campaign form and schema are in place.
 */

export type CampaignStatus = 'draft' | 'published';

export interface Campaign {
	id: string;
	name: string;
	cause: string;
	summary: string;
	goalCents: number;
	raisedCents: number;
	donors: number;
	status: CampaignStatus;
	startDate: string;
	endDate: string;
}

export interface DashboardUser {
	/** Placeholder for the authenticated user's username. */
	username: string;
	displayName: string;
	memberSince: string;
}

export interface CampaignDraft {
	name: string;
	cause: string;
	summary: string;
	goalCents: number;
	endDate: string;
}

export const causeOptions = [
	{ value: 'shelter', label: 'Local shelter supplies' },
	{ value: 'adoption', label: 'Adoption events' },
	{ value: 'rescue', label: 'Rescue transport' },
	{ value: 'medical', label: 'Vet care fund' },
	{ value: 'foster', label: 'Foster program' }
] as const;

export function causeLabel(value: string): string {
	return causeOptions.find((c) => c.value === value)?.label ?? 'Community cause';
}

/** Replace with the real session user once auth exists. */
export function getPlaceholderUser(): DashboardUser {
	return {
		username: 'maddie',
		displayName: 'Maddie',
		memberSince: 'March 2026'
	};
}

/** Replace with `db.campaign.findFirst({ where: { userId, status: 'published' } })`. */
export function getPlaceholderCampaign(): Campaign | null {
	return null;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatCurrency(cents: number): string {
	return currency.format(cents / 100);
}

export function formatDate(iso: string): string {
	const date = new Date(`${iso}T00:00:00`);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(date);
}

export function progressPercent(campaign: Campaign): number {
	if (campaign.goalCents <= 0) return 0;
	return Math.min(100, Math.round((campaign.raisedCents / campaign.goalCents) * 100));
}

export function daysRemaining(endDate: string, now: number): number {
	const end = new Date(`${endDate}T23:59:59`).getTime();
	if (Number.isNaN(end)) return 0;
	return Math.max(0, Math.ceil((end - now) / 86_400_000));
}

export function createCampaign(draft: CampaignDraft): Campaign {
	return {
		id: crypto.randomUUID(),
		name: draft.name,
		cause: draft.cause,
		summary: draft.summary,
		goalCents: draft.goalCents,
		// Placeholder totals until donations are tracked.
		raisedCents: 0,
		donors: 0,
		status: 'draft',
		startDate: new Date().toISOString().slice(0, 10),
		endDate: draft.endDate
	};
}

export function updateCampaign(campaign: Campaign, draft: CampaignDraft): Campaign {
	return { ...campaign, ...draft };
}
