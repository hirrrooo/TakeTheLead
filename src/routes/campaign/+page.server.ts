import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	CAMPAIGN_DURATION_MS,
	ActiveCampaignLimitError,
	closeExpiredCampaigns,
	createCampaign,
	parseCampaignDraft
} from '$lib/server/db/campaigns';
import type { Prisma } from '../../generated/prisma/client';

const activeCampaignFilter = (now: Date): Prisma.CampaignWhereInput => ({
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
});

export const load: PageServerLoad = async ({ locals }) => {
	const now = new Date();
	await closeExpiredCampaigns(now);

	const liveFilter = activeCampaignFilter(now);
	const [campaigns, totals, recentDonations, myPendingCampaigns] = await Promise.all([
		db.campaign.findMany({
			where: {
				visibility: 'PUBLIC',
				deletedAt: null,
				OR: [{ status: 'CLOSED' }, liveFilter]
			},
			orderBy: { createdAt: 'desc' },
			take: 50,
			include: {
				owner: { select: { name: true } },
				_count: { select: { donations: { where: { status: 'COMPLETED' } } } }
			}
		}),
		Promise.all([
			db.campaign.count({ where: liveFilter }),
			db.donation.aggregate({
				where: { status: 'COMPLETED', campaign: liveFilter },
				_sum: { amountCents: true },
				_count: { _all: true }
			})
		]),
		db.donation.findMany({
			where: {
				status: 'COMPLETED',
				campaign: { visibility: 'PUBLIC', status: { in: ['APPROVED', 'CLOSED'] }, deletedAt: null }
			},
			orderBy: { completedAt: 'desc' },
			take: 10,
			select: {
				id: true,
				amountCents: true,
				donorName: true,
				isAnonymous: true,
				createdAt: true,
				donorUser: { select: { name: true } },
				campaign: { select: { slug: true, title: true } }
			}
		}),
		locals.user
			? db.campaign.findMany({
					where: { ownerId: locals.user.id, status: 'PENDING_REVIEW', deletedAt: null },
					orderBy: { createdAt: 'desc' },
					select: { slug: true, title: true, publishedAt: true, deadline: true }
				})
			: Promise.resolve([])
	]);

	const [liveCount, donationTotals] = totals;
	return {
		campaigns: campaigns.map((campaign) => ({
			id: campaign.id,
			slug: campaign.slug,
			title: campaign.title,
			summary: campaign.summary ?? campaign.body,
			status: campaign.status === 'CLOSED' ? 'ended' : 'live',
			startDate: (campaign.publishedAt ?? campaign.createdAt).toISOString(),
			endDate: (
				campaign.deadline ??
				new Date((campaign.publishedAt ?? campaign.createdAt).getTime() + CAMPAIGN_DURATION_MS)
			).toISOString(),
			goalCents: campaign.goalAmountCents ?? 0,
			raisedCents: campaign.raisedCents,
			donorCount: campaign._count.donations,
			ownerName: campaign.owner.name ?? 'A Take the Lead member'
		})),
		myPendingCampaigns: myPendingCampaigns.map((campaign) => ({
			slug: campaign.slug,
			title: campaign.title,
			startDate: campaign.publishedAt?.toISOString() ?? null,
			endDate: campaign.deadline?.toISOString() ?? null,
			ended: campaign.deadline !== null && campaign.deadline <= now
		})),
		totals: {
			liveCampaigns: liveCount,
			raisedCents: donationTotals._sum.amountCents ?? 0,
			donations: donationTotals._count._all
		},
		recentDonors: recentDonations.map((donation) => ({
			id: donation.id,
			name: donation.isAnonymous
				? 'Anonymous'
				: (donation.donorName ?? donation.donorUser?.name ?? 'Supporter'),
			amountCents: donation.amountCents,
			campaignTitle: donation.campaign.title,
			slug: donation.campaign.slug,
			createdAt: donation.createdAt.toISOString()
		})),
		user: locals.user ? { id: locals.user.id, name: locals.user.name } : null
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');

		const form = await request.formData();
		const draft = parseCampaignDraft(form);
		if (!draft) {
			return fail(400, {
				createError:
					'Enter a valid title, story, goal from $1 to $1,000,000, and a start date within 48 hours.'
			});
		}

		const now = new Date();
		await closeExpiredCampaigns(now);
		let campaign;
		try {
			campaign = await createCampaign(locals.user.id, draft);
		} catch (error) {
			if (error instanceof ActiveCampaignLimitError) {
				return fail(409, { createError: error.message });
			}
			throw error;
		}
		redirect(303, `/campaign/${campaign.slug}`);
	}
};
