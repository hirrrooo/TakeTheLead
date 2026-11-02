import { randomUUID } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	CAMPAIGN_DURATION_MS,
	campaignEndDate,
	closeExpiredCampaigns
} from '$lib/server/db/campaigns';
import {
	acceptPromiseToPay,
	buildPromiseToPayTexts,
	setOwnerCampaignState,
	ValidationError
} from '$lib/server/db/queries';

const ACTIVE_CAMPAIGN_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PAUSED'];

function parseMoneyCents(value: string) {
	const normalized = value.trim();
	if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) return null;

	const [dollars, cents = ''] = normalized.split('.');
	const amount = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
	return Number.isSafeInteger(amount) && amount > 0 && amount <= 100_000_000 ? amount : null;
}

function parseNonNegativeMoneyCents(value: string) {
	const normalized = value.trim();
	if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) return null;

	const [dollars, cents = ''] = normalized.split('.');
	const amount = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
	return Number.isSafeInteger(amount) && amount >= 0 && amount <= 100_000_000 ? amount : null;
}

function extractCreateDraft(form: FormData) {
	return {
		title: String(form.get('title') ?? '').trim(),
		summary: String(form.get('summary') ?? '').trim(),
		story: String(form.get('story') ?? '').trim(),
		billAmount: String(form.get('billAmount') ?? '').trim(),
		ttlCoversAmount: String(form.get('ttlCoversAmount') ?? '').trim(),
		ownerMaxAmount: String(form.get('ownerMaxAmount') ?? '').trim(),
		petName: String(form.get('petName') ?? '').trim(),
		petSpecies: String(form.get('petSpecies') ?? '').trim(),
		petBreed: String(form.get('petBreed') ?? '').trim(),
		vetHospitalId: String(form.get('vetHospitalId') ?? '').trim(),
		hospitalName: String(form.get('hospitalName') ?? '').trim(),
		hospitalCity: String(form.get('hospitalCity') ?? '').trim(),
		coverImageUrl: String(form.get('coverImageUrl') ?? '').trim()
	};
}

function parseCampaignForm(form: FormData) {
	const raw = extractCreateDraft(form);
	const {
		title,
		summary,
		story,
		billAmount,
		ttlCoversAmount,
		ownerMaxAmount,
		petName,
		petSpecies,
		petBreed,
		vetHospitalId,
		hospitalName,
		hospitalCity,
		coverImageUrl
	} = raw;

	const billAmountCents = parseMoneyCents(billAmount);
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
		return { ok: false as const, reason: 'fields' as const, createDraft: raw };
	}
	if (
		vetHospitalId === 'new' &&
		(hospitalName.length < 2 || hospitalName.length > 160 || hospitalCity.length > 100)
	) {
		return { ok: false as const, reason: 'fields' as const, createDraft: raw };
	}

	if (coverImageUrl) {
		try {
			if (new URL(coverImageUrl).protocol !== 'https:') {
				return { ok: false as const, reason: 'fields' as const, createDraft: raw };
			}
		} catch {
			return { ok: false as const, reason: 'fields' as const, createDraft: raw };
		}
	}

	const ttlCoversCents =
		ttlCoversAmount === '' ? billAmountCents : parseNonNegativeMoneyCents(ttlCoversAmount);
	if (ttlCoversCents === null || ttlCoversCents > billAmountCents) {
		return { ok: false as const, reason: 'promise_amounts' as const, createDraft: raw };
	}

	const ownerMaxObligationCents =
		ownerMaxAmount === ''
			? billAmountCents - ttlCoversCents
			: parseNonNegativeMoneyCents(ownerMaxAmount);
	if (
		ownerMaxObligationCents === null ||
		ttlCoversCents + ownerMaxObligationCents !== billAmountCents
	) {
		return { ok: false as const, reason: 'promise_amounts' as const, createDraft: raw };
	}

	const promiseAcceptedVal = form.get('promiseAccepted');
	const promiseAccepted = promiseAcceptedVal === 'on' || promiseAcceptedVal === 'true';
	if (!promiseAccepted) {
		return { ok: false as const, reason: 'promise_unaccepted' as const, createDraft: raw };
	}

	return {
		ok: true as const,
		createDraft: raw,
		draft: {
			title,
			summary,
			story,
			billAmountCents,
			ttlCoversCents,
			ownerMaxObligationCents,
			promiseAccepted: true as const,
			petName,
			petSpecies,
			petBreed,
			vetHospitalId,
			hospitalName,
			hospitalCity,
			coverImageUrl: coverImageUrl || null
		}
	};
}

async function countCampaignDonors(campaignId: string) {
	const [members, namedGuests, anonymousGuestDonations] = await Promise.all([
		db.donation.groupBy({
			by: ['donorUserId'],
			where: { campaignId, status: 'COMPLETED', donorUserId: { not: null } }
		}),
		db.donation.findMany({
			where: {
				campaignId,
				status: 'COMPLETED',
				donorUserId: null,
				isAnonymous: false,
				donorName: { not: null }
			},
			distinct: ['donorName'],
			select: { donorName: true }
		}),
		db.donation.count({
			where: { campaignId, status: 'COMPLETED', donorUserId: null, isAnonymous: true }
		})
	]);

	return members.length + namedGuests.length + anonymousGuestDonations;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login');

	const now = new Date();
	await closeExpiredCampaigns(now, locals.user.id);

	const [campaign, hospitals] = await Promise.all([
		db.campaign.findFirst({
			where: {
				ownerId: locals.user.id,
				status: { in: [...ACTIVE_CAMPAIGN_STATUSES] },
				deletedAt: null
			},
			orderBy: { createdAt: 'desc' },
			include: {
				vetHospital: { select: { id: true, name: true, city: true } },
				promiseToPay: {
					select: {
						id: true,
						billAmountCents: true,
						ttlCoversCents: true,
						ownerMaxObligationCents: true,
						ttlCoversText: true,
						ownerObligationText: true,
						accepted: true,
						acceptedAt: true,
						termsVersion: true
					}
				},
				pets: {
					where: { role: 'PRIMARY' },
					include: { pet: { select: { id: true, name: true, species: true, breed: true } } }
				},
				donations: {
					where: { status: 'COMPLETED', message: { not: null } },
					orderBy: { completedAt: 'desc' },
					take: 8,
					select: {
						id: true,
						amountCents: true,
						message: true,
						isAnonymous: true,
						donorName: true,
						donorUser: { select: { name: true } },
						completedAt: true
					}
				}
			}
		}),
		db.vetHospital.findMany({
			where: { deletedAt: null },
			orderBy: [{ city: 'asc' }, { name: 'asc' }],
			select: { id: true, name: true, city: true }
		})
	]);

	const campaignEnd =
		campaign && ['APPROVED', 'PAUSED'].includes(campaign.status) ? campaignEndDate(campaign) : null;
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
					billAmountCents:
						campaign.promiseToPay?.billAmountCents ??
						campaign.billAmountCents ??
						campaign.goalAmountCents ??
						0,
					goalAmountCents: campaign.goalAmountCents ?? campaign.billAmountCents ?? 0,
					raisedCents: campaign.raisedCents,
					donorCount,
					startDate: (campaign.publishedAt ?? campaign.createdAt).toISOString(),
					endDate: campaignEnd?.toISOString() ?? null,
					daysLeft: campaignEnd
						? Math.max(0, Math.ceil((campaignEnd.getTime() - now.getTime()) / 86_400_000))
						: null,
					hospital: campaign.vetHospital,
					pet: campaign.pets[0]?.pet ?? null,
					promiseToPay: campaign.promiseToPay
						? {
								id: campaign.promiseToPay.id,
								billAmountCents: campaign.promiseToPay.billAmountCents,
								ttlCoversCents:
									campaign.promiseToPay.ttlCoversCents ?? campaign.promiseToPay.billAmountCents,
								ownerMaxObligationCents: campaign.promiseToPay.ownerMaxObligationCents,
								ttlCoversText: campaign.promiseToPay.ttlCoversText,
								ownerObligationText: campaign.promiseToPay.ownerObligationText,
								accepted: campaign.promiseToPay.accepted,
								acceptedAt: campaign.promiseToPay.acceptedAt?.toISOString() ?? null,
								termsVersion: campaign.promiseToPay.termsVersion
							}
						: null,
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
		const parsed = parseCampaignForm(await request.formData());
		if (!parsed.ok) {
			if (parsed.reason === 'promise_unaccepted') {
				return fail(400, {
					error:
						'You must check "I understand" to accept the Promise to Pay terms before publishing your campaign.',
					createDraft: parsed.createDraft
				});
			}
			if (parsed.reason === 'promise_amounts') {
				return fail(400, {
					error:
						'What TakeTheLead covers plus your maximum owner obligation must equal the total veterinary bill.',
					createDraft: parsed.createDraft
				});
			}
			return fail(400, {
				error:
					'Complete the pet, hospital, bill, campaign title, short description, and story with valid details.',
				createDraft: parsed.createDraft
			});
		}

		const { draft } = parsed;
		const now = new Date();
		await closeExpiredCampaigns(now, locals.user.id);
		const slug = `${
			draft.title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '')
				.slice(0, 60) || 'campaign'
		}-${randomUUID().slice(0, 8)}`;

		try {
			await db.$transaction(async (tx) => {
				const activeCampaign = await tx.campaign.findFirst({
					where: {
						ownerId: userId,
						status: { in: [...ACTIVE_CAMPAIGN_STATUSES] },
						deletedAt: null
					},
					select: { id: true }
				});
				if (activeCampaign) {
					throw new ValidationError('You may only have one active campaign at a time.');
				}

				if (
					!draft.promiseAccepted ||
					draft.ttlCoversCents + draft.ownerMaxObligationCents !== draft.billAmountCents
				) {
					throw new ValidationError(
						'Campaign cannot be published without an accepted Promise to Pay.'
					);
				}

				let vetHospitalId: string;
				let resolvedHospitalName: string;
				if (draft.vetHospitalId === 'new') {
					const hospital = await tx.vetHospital.create({
						data: {
							name: draft.hospitalName,
							city: draft.hospitalCity || null,
							createdById: userId,
							isVerified: false
						},
						select: { id: true, name: true }
					});
					vetHospitalId = hospital.id;
					resolvedHospitalName = hospital.name;
				} else {
					const hospital = await tx.vetHospital.findFirst({
						where: { id: draft.vetHospitalId, deletedAt: null },
						select: { id: true, name: true }
					});
					if (!hospital) throw new ValidationError('Choose a listed veterinary hospital.');
					vetHospitalId = hospital.id;
					resolvedHospitalName = hospital.name;
				}

				const { ttlCoversText, ownerObligationText } = buildPromiseToPayTexts({
					billAmountCents: draft.billAmountCents,
					ttlCoversCents: draft.ttlCoversCents,
					ownerMaxObligationCents: draft.ownerMaxObligationCents,
					hospitalName: resolvedHospitalName
				});

				await tx.campaign.create({
					data: {
						slug,
						title: draft.title,
						summary: draft.summary,
						body: draft.story,
						coverImageUrl: draft.coverImageUrl,
						goalAmountCents: draft.ttlCoversCents,
						billAmountCents: draft.billAmountCents,
						ownerId: userId,
						vetHospitalId,
						status: 'APPROVED',
						visibility: 'PUBLIC',
						publishedAt: now,
						deadline: new Date(now.getTime() + CAMPAIGN_DURATION_MS),
						members: {
							create: {
								userId,
								role: 'OWNER',
								status: 'ACCEPTED'
							}
						},
						pets: {
							create: {
								role: 'PRIMARY',
								pet: {
									create: {
										name: draft.petName,
										species: draft.petSpecies,
										breed: draft.petBreed || null,
										ownerId: userId
									}
								}
							}
						},
						promiseToPay: {
							create: {
								billAmountCents: draft.billAmountCents,
								ttlCoversCents: draft.ttlCoversCents,
								ownerMaxObligationCents: draft.ownerMaxObligationCents,
								ttlCoversText,
								ownerObligationText,
								accepted: true,
								acceptedAt: now,
								acceptedBy: userId,
								termsVersion: '2026-10'
							}
						}
					}
				});
			});
		} catch (error) {
			if (error instanceof ValidationError) {
				return fail(409, { error: error.message, createDraft: parsed.createDraft });
			}
			throw error;
		}

		return { success: 'published' };
	},
	acceptPromise: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const userId = locals.user.id;
		const form = await request.formData();
		const campaignId = String(form.get('campaignId') ?? '').trim();
		const promiseAcceptedVal = form.get('promiseAccepted');
		const promiseAccepted = promiseAcceptedVal === 'on' || promiseAcceptedVal === 'true';

		if (!campaignId) {
			return fail(400, { error: 'Campaign not found.' });
		}
		if (!promiseAccepted) {
			return fail(400, {
				error:
					'You must check "I understand" to accept the Promise to Pay terms before publishing your campaign.'
			});
		}

		const existing = await db.campaign.findFirst({
			where: { id: campaignId, ownerId: userId, deletedAt: null },
			include: {
				vetHospital: { select: { name: true } },
				promiseToPay: true
			}
		});
		if (!existing) {
			return fail(404, { error: 'Campaign not found.' });
		}

		const billAmountCents =
			existing.promiseToPay?.billAmountCents ??
			existing.billAmountCents ??
			existing.goalAmountCents ??
			0;
		const ttlCoversCents =
			existing.promiseToPay?.ttlCoversCents ?? existing.goalAmountCents ?? billAmountCents;
		const ownerMaxObligationCents =
			existing.promiseToPay?.ownerMaxObligationCents ??
			Math.max(0, billAmountCents - ttlCoversCents);
		const defaults = buildPromiseToPayTexts({
			billAmountCents,
			ttlCoversCents,
			ownerMaxObligationCents,
			hospitalName: existing.vetHospital?.name
		});

		try {
			await acceptPromiseToPay({
				campaignId,
				userId,
				billAmountCents,
				ttlCoversCents,
				ownerMaxObligationCents,
				ttlCoversText: existing.promiseToPay?.ttlCoversText || defaults.ttlCoversText,
				ownerObligationText:
					existing.promiseToPay?.ownerObligationText || defaults.ownerObligationText
			});
		} catch (error) {
			if (error instanceof ValidationError) return fail(400, { error: error.message });
			throw error;
		}

		return { success: 'promise_accepted' };
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

		const updated = await db.campaign.updateMany({
			where: {
				id: campaignId,
				ownerId: locals.user.id,
				status: { in: [...ACTIVE_CAMPAIGN_STATUSES] },
				deletedAt: null
			},
			data: {
				title,
				summary,
				body: story,
				coverImageUrl: coverImageUrl || null
			}
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
	}
};

function isHttpsUrl(value: string) {
	try {
		return new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
}
