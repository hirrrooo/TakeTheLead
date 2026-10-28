import type { PageServerLoad } from './$types';
import { closeExpiredCampaigns, getCampaignDeadline } from '$lib/server/db/campaign-lifecycle';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const now = new Date();
	await closeExpiredCampaigns(undefined, now);

	const campaigns = await db.campaign.findMany({
		where: {
			visibility: 'PUBLIC',
			status: { in: ['APPROVED', 'PAUSED'] },
			deletedAt: null
		},
		orderBy: { publishedAt: 'desc' },
		take: 50,
		select: {
			slug: true,
			title: true,
			summary: true,
			coverImageUrl: true,
			status: true,
			raisedCents: true,
			billAmountCents: true,
			goalAmountCents: true,
			createdAt: true,
			publishedAt: true,
			deadline: true,
			owner: { select: { name: true } },
			vetHospital: { select: { city: true } }
		}
	});

	return {
		campaigns: campaigns.map((campaign) => ({
			slug: campaign.slug,
			title: campaign.title,
			summary: campaign.summary ?? '',
			coverImageUrl: campaign.coverImageUrl,
			status: campaign.status,
			raisedCents: campaign.raisedCents,
			billAmountCents: campaign.billAmountCents ?? campaign.goalAmountCents ?? 0,
			endDate: getCampaignDeadline(campaign).toISOString(),
			ownerFirstName: campaign.owner.name?.trim().split(/\s+/)[0] ?? 'A pet owner',
			city: campaign.vetHospital?.city ?? null
		}))
	};
};
