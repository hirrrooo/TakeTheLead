import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	CAMPAIGN_DURATION_MS,
	ActiveCampaignLimitError,
	closeExpiredCampaigns,
	createCampaign,
	parseCampaignDraft
} from '$lib/server/db/campaigns';
import {
	getBrowseTotals,
	listBrowseCampaigns,
	listPendingCampaignsForOwner,
	listRecentPublicDonations
} from '$lib/server/db/browse';

export const load: PageServerLoad = async ({ locals }) => {
	const now = new Date();
	await closeExpiredCampaigns(now);

	const [campaigns, totals, recentDonations, myPendingCampaigns] = await Promise.all([
		listBrowseCampaigns(now),
		getBrowseTotals(now),
		listRecentPublicDonations(10),
		locals.user ? listPendingCampaignsForOwner(locals.user.id) : Promise.resolve([])
	]);

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
			liveCampaigns: totals.liveCampaigns,
			raisedCents: totals.raisedCents,
			donations: totals.donationCount
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
