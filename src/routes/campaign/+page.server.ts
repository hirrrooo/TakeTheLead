import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { normalizeSearchQuery } from '$lib/server/db/campaign-search';
import { db } from '$lib/server/db';
import {
	ActiveCampaignLimitError,
	closeExpiredCampaigns,
	createCampaign,
	getPlatformTotals,
	listPublicCampaigns,
	listRecentPublicDonors,
	parseCampaignDraft
} from '$lib/server/db/campaigns';

export const load: PageServerLoad = async ({ locals, url }) => {
	const now = new Date();
	const query = normalizeSearchQuery(url.searchParams.get('q'));

	const [campaigns, totals, recentDonors, myPendingCampaigns] = await Promise.all([
		listPublicCampaigns(now, 50, query),
		getPlatformTotals(now),
		listRecentPublicDonors(10),
		locals.user
			? db.campaign.findMany({
					where: { ownerId: locals.user.id, status: 'PENDING_REVIEW', deletedAt: null },
					orderBy: { createdAt: 'desc' },
					select: { slug: true, title: true, publishedAt: true, deadline: true }
				})
			: Promise.resolve([])
	]);

	return {
		campaigns,
		query,
		myPendingCampaigns: myPendingCampaigns.map((campaign) => ({
			slug: campaign.slug,
			title: campaign.title,
			startDate: campaign.publishedAt?.toISOString() ?? null,
			endDate: campaign.deadline?.toISOString() ?? null,
			ended: campaign.deadline !== null && campaign.deadline <= now
		})),
		totals,
		recentDonors,
		user: locals.user ? { id: locals.user.id, name: locals.user.name } : null
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/demo/better-auth/login');

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
