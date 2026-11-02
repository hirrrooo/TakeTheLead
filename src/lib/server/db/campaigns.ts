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

export interface PublishedCampaignDraft {
	title: string;
	summary: string;
	story: string;
	billAmountCents: number;
	petName: string;
	petSpecies: string;
	petBreed?: string | null;
	/** An existing hospital id, or the literal "new" to create one from the fields below. */
	vetHospitalId: string;
	hospitalName?: string;
	hospitalCity?: string;
	coverImageUrl?: string | null;
}

/**
 * Create a campaign that is live immediately (the owner-facing flow), together
 * with its primary pet and, when asked, a new directory hospital. One active
 * campaign per owner is enforced inside the same transaction, so two parallel
 * submits cannot both publish.
 */
export async function createPublishedCampaign(ownerId: string, draft: PublishedCampaignDraft) {
	const now = new Date();
	const slug = `${
		draft.title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 60) || 'campaign'
	}-${randomUUID().slice(0, 8)}`;

	return db.$transaction(async (tx) => {
		const activeCampaign = await tx.campaign.findFirst({
			where: {
				ownerId,
				status: { in: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PAUSED'] },
				deletedAt: null
			},
			select: { id: true }
		});
		if (activeCampaign) throw new ActiveCampaignLimitError();

		let vetHospitalId: string;
		if (draft.vetHospitalId === 'new') {
			const hospital = await tx.vetHospital.create({
				data: {
					name: draft.hospitalName ?? '',
					city: draft.hospitalCity || null,
					createdById: ownerId,
					isVerified: false
				},
				select: { id: true }
			});
			vetHospitalId = hospital.id;
		} else {
			const hospital = await tx.vetHospital.findFirst({
				where: { id: draft.vetHospitalId, deletedAt: null },
				select: { id: true }
			});
			if (!hospital) throw new CampaignNotFoundError(`Hospital ${draft.vetHospitalId} not found`);
			vetHospitalId = hospital.id;
		}

		return tx.campaign.create({
			data: {
				slug,
				title: draft.title,
				summary: draft.summary,
				body: draft.story,
				coverImageUrl: draft.coverImageUrl ?? null,
				goalAmountCents: draft.billAmountCents,
				billAmountCents: draft.billAmountCents,
				ownerId,
				vetHospitalId,
				status: 'APPROVED',
				visibility: 'PUBLIC',
				publishedAt: now,
				deadline: new Date(now.getTime() + CAMPAIGN_DURATION_MS),
				pets: {
					create: {
						role: 'PRIMARY',
						pet: {
							create: {
								name: draft.petName,
								species: draft.petSpecies,
								breed: draft.petBreed || null,
								ownerId
							}
						}
					}
				}
			}
		});
	});
}

export interface CampaignContentEdit {
	title: string;
	summary: string;
	body: string;
	coverImageUrl?: string | null;
}

const EDITABLE_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PAUSED'];

/**
 * Edit an owned campaign's presentation fields. Ownership and editability are
 * part of the WHERE clause, so a single statement enforces both — the returned
 * count is 1 only when the caller really may edit that campaign.
 */
export async function updateCampaignContent(
	campaignId: string,
	ownerId: string,
	edit: CampaignContentEdit
) {
	return db.campaign.updateMany({
		where: {
			id: campaignId,
			ownerId,
			status: { in: EDITABLE_STATUSES },
			deletedAt: null
		},
		data: {
			title: edit.title,
			summary: edit.summary,
			body: edit.body,
			coverImageUrl: edit.coverImageUrl || null
		}
	});
}

/**
 * Distinct supporters of a campaign: registered donors, plus named guests
 * deduplicated by name, plus every anonymous guest counted separately.
 */
export async function countCampaignDonors(campaignId: string) {
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

export const ACTIVE_CAMPAIGN_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PAUSED'] as const;

/**
 * The owner's one active (non-terminal) campaign with everything the dashboard
 * renders: primary pet, hospital, and recent supporter messages.
 */
export async function findActiveCampaignForOwner(ownerId: string) {
	return db.campaign.findFirst({
		where: {
			ownerId,
			status: { in: [...ACTIVE_CAMPAIGN_STATUSES] },
			deletedAt: null
		},
		orderBy: { createdAt: 'desc' },
		include: {
			vetHospital: { select: { id: true, name: true, city: true } },
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
	});
}

/** Minimal hospital list for owner-facing pickers. */
export async function listHospitalOptions() {
	return db.vetHospital.findMany({
		where: { deletedAt: null },
		orderBy: [{ city: 'asc' }, { name: 'asc' }],
		select: { id: true, name: true, city: true }
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

/**
 * Every live campaign with the owner, hospital, promise-to-pay flag and donation
 * count attached. Used by the developer bench and available for any future
 * moderation/admin listing that needs the same shape.
 */
export async function listCampaignOverview() {
	return db.campaign.findMany({
		where: { deletedAt: null },
		orderBy: { createdAt: 'desc' },
		include: {
			owner: { select: { id: true, name: true } },
			vetHospital: { select: { name: true, postalCode: true } },
			promiseToPay: { select: { accepted: true } },
			_count: { select: { donations: true } }
		}
	});
}

/** The cached raised total and slug for one campaign, for post-write reporting. */
export async function getCampaignTotals(campaignId: string) {
	return db.campaign.findUnique({
		where: { id: campaignId },
		select: { raisedCents: true, slug: true }
	});
}
