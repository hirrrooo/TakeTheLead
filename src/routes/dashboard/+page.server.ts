import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import {
	ActiveCampaignLimitError,
	CampaignNotFoundError,
	campaignEndDate,
	closeExpiredCampaigns,
	countCampaignDonors,
	createPublishedCampaign,
	findActiveCampaignForOwner,
	listHospitalOptions,
	updateCampaignContent
} from '$lib/server/db/campaigns';
import { setOwnerCampaignState, ValidationError } from '$lib/server/db/queries';

function parseMoneyCents(value: string) {
	const normalized = value.trim();
	if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) return null;

	const [dollars, cents = ''] = normalized.split('.');
	const amount = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
	return Number.isSafeInteger(amount) && amount > 0 && amount <= 100_000_000 ? amount : null;
}

function parseCampaignForm(form: FormData) {
	const title = String(form.get('title') ?? '').trim();
	const summary = String(form.get('summary') ?? '').trim();
	const story = String(form.get('story') ?? '').trim();
	const billAmountCents = parseMoneyCents(String(form.get('billAmount') ?? ''));
	const petName = String(form.get('petName') ?? '').trim();
	const petSpecies = String(form.get('petSpecies') ?? '').trim();
	const petBreed = String(form.get('petBreed') ?? '').trim();
	const vetHospitalId = String(form.get('vetHospitalId') ?? '').trim();
	const hospitalName = String(form.get('hospitalName') ?? '').trim();
	const hospitalCity = String(form.get('hospitalCity') ?? '').trim();
	const coverImageUrl = String(form.get('coverImageUrl') ?? '').trim();

	if (
		title.length < 3 ||
		title.length > 120 ||
		summary.length < 10 ||
		summary.length > 300 ||
		story.length < 20 ||
		story.length > 5000 ||
		billAmountCents === null ||
		petName.length < 1 ||
		petName.length > 80 ||
		petSpecies.length < 2 ||
		petSpecies.length > 40 ||
		petBreed.length > 80 ||
		!vetHospitalId
	) {
		return null;
	}
	if (
		vetHospitalId === 'new' &&
		(hospitalName.length < 2 || hospitalName.length > 160 || hospitalCity.length > 100)
	) {
		return null;
	}

	if (coverImageUrl) {
		try {
			if (new URL(coverImageUrl).protocol !== 'https:') return null;
		} catch {
			return null;
		}
	}

	return {
		title,
		summary,
		story,
		billAmountCents,
		petName,
		petSpecies,
		petBreed,
		vetHospitalId,
		hospitalName,
		hospitalCity,
		coverImageUrl: coverImageUrl || null
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login');

	const now = new Date();
	await closeExpiredCampaigns(now, locals.user.id);

	const [campaign, hospitals] = await Promise.all([
		findActiveCampaignForOwner(locals.user.id),
		listHospitalOptions()
	]);

	const campaignEnd =
		campaign && ['APPROVED', 'PAUSED'].includes(campaign.status)
			? campaignEndDate(campaign)
			: null;
	const donorCount = campaign ? await countCampaignDonors(campaign.id) : 0;

	return {
		user: {
			name: locals.user.name ?? locals.user.email.split('@')[0],
			email: locals.user.email
		},
		hospitals,
		now: now.toISOString(),
		campaign: campaign
			? {
					id: campaign.id,
					slug: campaign.slug,
					title: campaign.title,
					summary: campaign.summary ?? '',
					story: campaign.body,
					coverImageUrl: campaign.coverImageUrl,
					status: campaign.status,
					billAmountCents: campaign.billAmountCents ?? campaign.goalAmountCents ?? 0,
					raisedCents: campaign.raisedCents,
					donorCount,
					startDate: (campaign.publishedAt ?? campaign.createdAt).toISOString(),
					endDate: campaignEnd?.toISOString() ?? null,
					daysLeft: campaignEnd
						? Math.max(0, Math.ceil((campaignEnd.getTime() - now.getTime()) / 86_400_000))
						: null,
					hospital: campaign.vetHospital,
					pet: campaign.pets[0]?.pet ?? null,
					messages: campaign.donations.map((donation) => ({
						id: donation.id,
						text: donation.message ?? '',
						donor: donation.isAnonymous
							? 'Anonymous'
							: (donation.donorUser?.name?.split(/\s+/)[0] ??
								donation.donorName?.split(/\s+/)[0] ??
								'Supporter'),
						amountCents: donation.amountCents,
						createdAt: (donation.completedAt ?? now).toISOString()
					}))
				}
			: null
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const userId = locals.user.id;
		const draft = parseCampaignForm(await request.formData());
		if (!draft) {
			return fail(400, {
				error:
					'Complete the pet, hospital, bill, campaign title, short description, and story with valid details.'
			});
		}

		const now = new Date();
		await closeExpiredCampaigns(now, locals.user.id);

		try {
			await createPublishedCampaign(userId, draft);
		} catch (error) {
			if (error instanceof ActiveCampaignLimitError) {
				return fail(409, { error: error.message });
			}
			if (error instanceof CampaignNotFoundError) {
				return fail(400, { error: 'Choose a listed veterinary hospital.' });
			}
			throw error;
		}

		return { success: 'published' };
	},
	update: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const form = await request.formData();
		const campaignId = String(form.get('campaignId') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const summary = String(form.get('summary') ?? '').trim();
		const story = String(form.get('story') ?? '').trim();
		const coverImageUrl = String(form.get('coverImageUrl') ?? '').trim();
		const editDraft = { title, summary, story, coverImageUrl };

		if (
			!campaignId ||
			title.length < 3 ||
			title.length > 120 ||
			summary.length < 10 ||
			summary.length > 300 ||
			story.length < 20 ||
			story.length > 5000 ||
			(coverImageUrl && !isHttpsUrl(coverImageUrl))
		) {
			return fail(400, {
				editError: 'Enter a valid title, description, story, and secure photo URL.',
				editDraft
			});
		}

		const updated = await updateCampaignContent(campaignId, locals.user.id, {
			title,
			summary,
			body: story,
			coverImageUrl: coverImageUrl || null
		});
		if (updated.count !== 1) {
			return fail(404, {
				editError: 'Campaign not found or no longer editable.',
				editDraft
			});
		}
		return { success: 'updated' };
	},
	pause: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const campaignId = String((await request.formData()).get('campaignId') ?? '').trim();
		try {
			await setOwnerCampaignState(campaignId, locals.user.id, 'PAUSE');
			return { success: 'paused' };
		} catch (error) {
			if (error instanceof ValidationError) return fail(409, { error: error.message });
			throw error;
		}
	},
	resume: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const campaignId = String((await request.formData()).get('campaignId') ?? '').trim();
		try {
			await setOwnerCampaignState(campaignId, locals.user.id, 'RESUME');
			return { success: 'resumed' };
		} catch (error) {
			if (error instanceof ValidationError) return fail(409, { error: error.message });
			throw error;
		}
	},
	withdraw: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const campaignId = String((await request.formData()).get('campaignId') ?? '').trim();
		try {
			await setOwnerCampaignState(campaignId, locals.user.id, 'WITHDRAW');
			return { success: 'withdrawn' };
		} catch (error) {
			if (error instanceof ValidationError) return fail(409, { error: error.message });
			throw error;
		}
	},
	signOut: async ({ request }) => {
		await auth.api.signOut({ headers: request.headers });
		redirect(303, '/');
	}
};

function isHttpsUrl(value: string) {
	try {
		return new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
}
