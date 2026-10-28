import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	campaignEndDate,
	findCampaign,
	listRecentDonors,
	parseCurrencyCents
} from '$lib/server/db/campaigns';
import { recordDonation, ValidationError } from '$lib/server/db/queries';
import { randomUUID } from 'node:crypto';

export const load: PageServerLoad = async ({ params, locals }) => {
	const campaign = await findCampaign(params.slug);
	if (!campaign) error(404, 'Campaign not found');

	const isOwner = locals.user?.id === campaign.ownerId;
	if (campaign.visibility !== 'PUBLIC' && !isOwner) error(404, 'Campaign not found');
	if (!['APPROVED', 'CLOSED'].includes(campaign.status) && !isOwner) {
		error(404, 'Campaign not found');
	}

	const recentDonors =
		campaign.status === 'APPROVED' || campaign.status === 'CLOSED'
			? await listRecentDonors(campaign.id)
			: [];

	return {
		campaign: {
			id: campaign.id,
			slug: campaign.slug,
			title: campaign.title,
			summary: campaign.summary ?? campaign.body,
			status: campaign.status,
			live: campaign.live,
			ended: campaign.ended,
			startDate: (campaign.publishedAt ?? campaign.createdAt).toISOString(),
			endDate: campaignEndDate(campaign).toISOString(),
			goalCents: campaign.goalAmountCents ?? 0,
			raisedCents: campaign.raisedCents,
			donorCount: campaign._count.donations,
			ownerName: campaign.owner.name ?? 'A Take the Lead member'
		},
		recentDonors,
		user: locals.user ? { id: locals.user.id, name: locals.user.name } : null,
		isOwner
	};
};

export const actions: Actions = {
	donate: async ({ request, locals, params }) => {
		const form = await request.formData();
		const campaignId = String(form.get('campaignId') ?? '').trim();
		const amountCents = parseCurrencyCents(String(form.get('amount') ?? ''), 10_000_000);
		const name = String(form.get('name') ?? '').trim();
		const message = String(form.get('message') ?? '').trim();
		const anonymous = form.get('anonymous') === 'on';

		if (
			!campaignId ||
			amountCents === null ||
			message.length > 500 ||
			(!locals.user && name.length > 0 && (name.length < 2 || name.length > 100))
		) {
			return fail(400, { donationError: 'Enter a valid amount and donor details.' });
		}

		try {
			const campaign = await findCampaign(params.slug);
			if (!campaign || campaign.id !== campaignId) {
				return fail(400, { donationError: 'This campaign could not be found.' });
			}
			await recordDonation({
				campaignId,
				amountCents,
				status: 'COMPLETED',
				provider: 'SIMULATED',
				providerRef: `sim_${randomUUID()}`,
				donorUserId: locals.user?.id ?? null,
				donorName: locals.user ? null : anonymous ? 'Anonymous' : name || 'Supporter',
				isAnonymous: anonymous,
				message: message || null
			});
		} catch (error) {
			if (error instanceof ValidationError) {
				return fail(400, { donationError: error.message });
			}
			throw error;
		}

		return { donationSuccess: 'Simulated donation recorded. No payment was processed.' };
	}
};
