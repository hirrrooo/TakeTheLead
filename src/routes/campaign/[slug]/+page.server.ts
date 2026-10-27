import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { closeExpiredCampaigns, getCampaignDeadline } from '$lib/server/db/campaign-lifecycle';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params }) => {
	const now = new Date();
	await closeExpiredCampaigns(undefined, now);

	const campaign = await db.campaign.findFirst({
		where: { slug: params.slug, deletedAt: null },
		select: {
			title: true,
			summary: true,
			body: true,
			coverImageUrl: true,
			status: true,
			visibility: true,
			raisedCents: true,
			billAmountCents: true,
			goalAmountCents: true,
			createdAt: true,
			publishedAt: true,
			deadline: true,
			owner: { select: { name: true } },
			vetHospital: { select: { city: true } },
			pets: {
				where: { role: 'PRIMARY' },
				select: { pet: { select: { name: true, species: true } } }
			}
		}
	});

	if (!campaign) error(404, 'Campaign not found');
	if (campaign.visibility !== 'PUBLIC') error(404, 'Campaign not found');
	if (campaign.status === 'WITHDRAWN') {
		return {
			withdrawn: true as const
		};
	}
	if (!['APPROVED', 'PAUSED', 'CLOSED'].includes(campaign.status)) {
		error(404, 'Campaign not found');
	}

	return {
		withdrawn: false as const,
		campaign: {
			title: campaign.title,
			summary: campaign.summary ?? '',
			story: campaign.body,
			coverImageUrl: campaign.coverImageUrl,
			status: campaign.status,
			raisedCents: campaign.raisedCents,
			billAmountCents: campaign.billAmountCents ?? campaign.goalAmountCents ?? 0,
			endDate: getCampaignDeadline(campaign).toISOString(),
			ownerFirstName: campaign.owner.name?.trim().split(/\s+/)[0] ?? 'A pet owner',
			city: campaign.vetHospital?.city ?? null,
			pet: campaign.pets[0]?.pet ?? null
		}
	};
};
