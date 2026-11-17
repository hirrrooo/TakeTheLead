/**
 * Server-only reads for the public campaign browse page: the live/ended listing,
 * the site-wide totals, the recent-donor ticker, and a member's own campaigns
 * awaiting review.
 *
 * "Live" is defined once here (approved, public, started, not past its deadline)
 * so the listing, the counters and the donation ticker cannot drift apart as the
 * campaign window rules evolve.
 */
import { db } from '$lib/server/db';
import { CAMPAIGN_DURATION_MS } from '$lib/server/db/campaigns';
import type { Prisma } from '../../../generated/prisma/client';

/** Approved, public, already started and not yet past its deadline. */
export function activeCampaignFilter(now: Date): Prisma.CampaignWhereInput {
	return {
		status: 'APPROVED',
		visibility: 'PUBLIC',
		deletedAt: null,
		AND: [
			{
				OR: [{ publishedAt: { lte: now } }, { publishedAt: null, createdAt: { lte: now } }]
			},
			{
				OR: [
					{ deadline: { gt: now } },
					{
						deadline: null,
						OR: [
							{ publishedAt: { gt: new Date(now.getTime() - CAMPAIGN_DURATION_MS) } },
							{
								publishedAt: null,
								createdAt: { gt: new Date(now.getTime() - CAMPAIGN_DURATION_MS) }
							}
						]
					}
				]
			}
		]
	};
}

/** Public campaigns for the browse page: currently live plus closed ones. */
export async function listBrowseCampaigns(now: Date, take = 50) {
	const liveFilter = activeCampaignFilter(now);
	return db.campaign.findMany({
		where: {
			visibility: 'PUBLIC',
			deletedAt: null,
			OR: [{ status: 'CLOSED' }, liveFilter]
		},
		orderBy: { createdAt: 'desc' },
		take,
		include: {
			owner: { select: { name: true } },
			_count: { select: { donations: { where: { status: 'COMPLETED' } } } }
		}
	});
}

/** Live campaign count plus money/donation totals across live campaigns. */
export async function getBrowseTotals(now: Date) {
	const liveFilter = activeCampaignFilter(now);
	const [liveCampaigns, donations] = await Promise.all([
		db.campaign.count({ where: liveFilter }),
		db.donation.aggregate({
			where: { status: 'COMPLETED', campaign: liveFilter },
			_sum: { amountCents: true },
			_count: { _all: true }
		})
	]);
	return {
		liveCampaigns,
		raisedCents: donations._sum.amountCents ?? 0,
		donationCount: donations._count._all
	};
}

/** Recent completed donations on public campaigns, for the supporter ticker. */
export async function listRecentPublicDonations(take = 10) {
	return db.donation.findMany({
		where: {
			status: 'COMPLETED',
			campaign: { visibility: 'PUBLIC', status: { in: ['APPROVED', 'CLOSED'] }, deletedAt: null }
		},
		orderBy: { completedAt: 'desc' },
		take,
		select: {
			id: true,
			amountCents: true,
			donorName: true,
			isAnonymous: true,
			createdAt: true,
			donorUser: { select: { name: true } },
			campaign: { select: { slug: true, title: true } }
		}
	});
}

/** The member's own campaigns still awaiting review, shown to them only. */
export async function listPendingCampaignsForOwner(ownerId: string) {
	return db.campaign.findMany({
		where: { ownerId, status: 'PENDING_REVIEW', deletedAt: null },
		orderBy: { createdAt: 'desc' },
		select: { slug: true, title: true, publishedAt: true, deadline: true }
	});
}

export interface DonationStatusRow {
	status: string;
	donationCount: number;
	raisedCents: number;
}

/** Completed/pending/refunded… totals per donation status across all campaigns. */
export async function donationStatusBreakdown(): Promise<DonationStatusRow[]> {
	const rows = await db.donation.groupBy({
		by: ['status'],
		_count: { _all: true },
		_sum: { amountCents: true }
	});
	return rows.map((row) => ({
		status: row.status,
		donationCount: row._count._all,
		raisedCents: row._sum.amountCents ?? 0
	}));
}

/**
 * Newest donations of any status, including their campaign slug. Unlike
 * listRecentPublicDonations this ignores campaign visibility, which is what a
 * developer bench wants when exercising the donation state machine.
 */
export async function listRecentDonationsAnyStatus(take = 12) {
	return db.donation.findMany({
		orderBy: { createdAt: 'desc' },
		take,
		select: {
			id: true,
			status: true,
			provider: true,
			amountCents: true,
			donorName: true,
			isAnonymous: true,
			campaignId: true,
			campaign: { select: { slug: true } }
		}
	});
}
