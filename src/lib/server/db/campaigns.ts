import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import type { Campaign } from '../../../generated/prisma/client';

export const CAMPAIGN_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const CAMPAIGN_START_WINDOW_MS = 48 * 60 * 60 * 1000;

export class CampaignNotFoundError extends Error {}

export class ActiveCampaignLimitError extends Error {
	constructor() {
		super('You may only have one active campaign at a time.');
		this.name = 'ActiveCampaignLimitError';
	}
}

export interface CampaignDraft {
	title: string;
	summary: string;
	goalAmountCents: number;
	startDate: string;
}

export function parseCurrencyCents(value: string, maximumCents: number): number | null {
	const normalized = value.trim();
	if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) return null;

	const [dollars, cents = ''] = normalized.split('.');
	const amountCents = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
	if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > maximumCents) {
		return null;
	}

	return amountCents;
}

export function campaignWindowsOverlap(start: Date, end: Date, otherStart: Date, otherEnd: Date) {
	return start < otherEnd && otherStart < end;
}

export function parseCampaignDraft(form: FormData, now = new Date()): CampaignDraft | null {
	const title = String(form.get('title') ?? '').trim();
	const summary = String(form.get('summary') ?? '').trim();
	const goal = String(form.get('goal') ?? '').trim();
	const startDate = String(form.get('startDate') ?? '').trim();
	const timezoneOffset = Number(form.get('timezoneOffset') ?? 0);
	const goalAmountCents = parseCurrencyCents(goal, 100_000_000);

	if (
		title.length < 3 ||
		title.length > 120 ||
		summary.length < 10 ||
		summary.length > 5000 ||
		goalAmountCents === null ||
		goalAmountCents < 100 ||
		!/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
		!Number.isInteger(timezoneOffset) ||
		timezoneOffset < -840 ||
		timezoneOffset > 840
	) {
		return null;
	}

	const selectedDateUtc = new Date(`${startDate}T00:00:00.000Z`);
	if (
		Number.isNaN(selectedDateUtc.getTime()) ||
		selectedDateUtc.toISOString().slice(0, 10) !== startDate
	) {
		return null;
	}
	const selectedStart = new Date(selectedDateUtc.getTime() + timezoneOffset * 60_000);
	const localToday = new Date(now.getTime() - timezoneOffset * 60_000);
	const today = new Date(
		Date.UTC(localToday.getUTCFullYear(), localToday.getUTCMonth(), localToday.getUTCDate()) +
			timezoneOffset * 60_000
	);
	if (selectedStart < today) return null;

	const start = Math.max(selectedStart.getTime(), now.getTime());
	if (start > now.getTime() + CAMPAIGN_START_WINDOW_MS) return null;

	return {
		title,
		summary,
		goalAmountCents,
		startDate: new Date(start).toISOString()
	};
}

export async function closeExpiredCampaigns(now = new Date(), ownerId?: string) {
	const legacyDeadline = new Date(now.getTime() - CAMPAIGN_DURATION_MS);
	const expired = await db.campaign.findMany({
		where: {
			...(ownerId ? { ownerId } : {}),
			deletedAt: null,
			status: { in: ['APPROVED', 'PAUSED'] },
			OR: [
				{ deadline: { lte: now } },
				{
					deadline: null,
					OR: [
						{ publishedAt: { lte: legacyDeadline } },
						{ publishedAt: null, createdAt: { lte: legacyDeadline } }
					]
				}
			]
		},
		select: { id: true, deadline: true, publishedAt: true, createdAt: true }
	});

	if (expired.length === 0) return 0;

	const results = await Promise.all(
		expired.map((campaign) =>
			db.campaign.updateMany({
				where: {
					id: campaign.id,
					status: { in: ['APPROVED', 'PAUSED'] }
				},
				data: {
					status: 'CLOSED',
					closedAt:
						campaign.deadline ??
						new Date((campaign.publishedAt ?? campaign.createdAt).getTime() + CAMPAIGN_DURATION_MS)
				}
			})
		)
	);

	return results.reduce((count, result) => count + result.count, 0);
}

export async function createCampaign(ownerId: string, draft: CampaignDraft) {
	const start = new Date(draft.startDate);
	const deadline = new Date(start.getTime() + CAMPAIGN_DURATION_MS);

	const slug = `${
		draft.title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 60) || 'campaign'
	}-${randomUUID().slice(0, 8)}`;

	return db.$transaction(async (tx) => {
		const approvedCampaigns = await tx.campaign.findMany({
			where: { ownerId, status: 'APPROVED', deletedAt: null },
			select: { createdAt: true, publishedAt: true, deadline: true }
		});
		const conflictsWithActiveCampaign = approvedCampaigns.some((campaign) => {
			const existingStart = campaign.publishedAt ?? campaign.createdAt;
			return campaignWindowsOverlap(start, deadline, existingStart, campaignEndDate(campaign));
		});
		if (conflictsWithActiveCampaign) throw new ActiveCampaignLimitError();

		return tx.campaign.create({
			data: {
				slug,
				title: draft.title,
				summary: draft.summary,
				body: draft.summary,
				goalAmountCents: draft.goalAmountCents,
				ownerId,
				status: 'PENDING_REVIEW',
				publishedAt: start,
				deadline,
				members: {
					create: { userId: ownerId, role: 'OWNER', status: 'ACCEPTED' }
				}
			},
			select: { id: true, slug: true }
		});
	});
}

export async function findCampaign(slug: string, now = new Date()) {
	await closeExpiredCampaigns(now);

	const campaign = await db.campaign.findFirst({
		where: { slug, deletedAt: null },
		include: {
			owner: { select: { id: true, name: true } },
			_count: { select: { donations: { where: { status: 'COMPLETED' } } } }
		}
	});
	if (!campaign) return null;

	return {
		...campaign,
		live:
			campaign.status === 'APPROVED' &&
			(campaign.publishedAt ?? campaign.createdAt) <= now &&
			campaignEndDate(campaign) > now,
		ended: campaign.status === 'CLOSED' || campaignEndDate(campaign) <= now
	};
}

export async function listRecentDonors(campaignId: string, take = 10) {
	const donations = await db.donation.findMany({
		where: { campaignId, status: 'COMPLETED' },
		orderBy: { completedAt: 'desc' },
		take,
		select: {
			id: true,
			amountCents: true,
			donorName: true,
			isAnonymous: true,
			createdAt: true,
			donorUser: { select: { name: true } }
		}
	});

	return donations.map((donation) => ({
		id: donation.id,
		amountCents: donation.amountCents,
		name: donation.isAnonymous
			? 'Anonymous'
			: (donation.donorName ?? donation.donorUser?.name ?? 'Supporter'),
		createdAt: donation.createdAt.toISOString()
	}));
}

export function campaignEndDate(
	campaign: Pick<Campaign, 'createdAt' | 'publishedAt' | 'deadline'>
) {
	return (
		campaign.deadline ??
		new Date((campaign.publishedAt ?? campaign.createdAt).getTime() + CAMPAIGN_DURATION_MS)
	);
}
