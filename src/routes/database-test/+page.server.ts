/**
 * /database-test — every TakeTheLead database interaction in one page (TTL-208).
 *
 * A developer harness, not a product surface: it exists so the schema, the
 * guarded query layer and the seed data can be exercised by hand before the
 * real UI exists. It is deliberately unauthenticated — instead of a session you
 * pick which demo user each action runs "as", which is what makes the ownership
 * and moderation guards testable at all.
 *
 * Every write goes through src/lib/server/db/queries, never a raw db.update, so
 * the page also proves the guard layer works — including the rejections.
 */
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	acceptPromiseToPay,
	computeRaisedCents,
	moderateCampaign,
	recordDonation,
	requireCampaignAccess,
	requireCampaignOwner,
	setDonationStatus,
	AccessDeniedError,
	ValidationError
} from '$lib/server/db/queries';
import type { Actions, PageServerLoad } from './$types';

/** Demo identities the page can act as. The system user is excluded on purpose. */
const ACTION_USERS = ['seed_maria', 'seed_james', 'seed_pat', 'seed_mod'] as const;

/** Reads a dollars input as integer cents. Blank or invalid returns null. */
function parseDollars(raw: FormDataEntryValue | null): number | null {
	const text = String(raw ?? '').trim();
	if (text === '') return null;
	const dollars = Number(text);
	if (!Number.isFinite(dollars) || dollars < 0) return null;
	return Math.round(dollars * 100);
}

function dollars(cents: number | null | undefined): string {
	if (cents === null || cents === undefined) return '—';
	return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Flash-message helpers. Expected failures keep the guard's own message so the
 * rejection demos show *why* the write was refused, not just that it was.
 */
function ok(title: string, detail: string) {
	return { ok: true, kind: 'ok' as const, title, detail };
}
function bad(title: string, error: unknown) {
	if (error instanceof AccessDeniedError) {
		return { ok: false, kind: 'denied' as const, title, detail: error.message };
	}
	if (error instanceof ValidationError) {
		return { ok: false, kind: 'invalid' as const, title, detail: error.message };
	}
	return {
		ok: false,
		kind: 'crashed' as const,
		title,
		detail: error instanceof Error ? error.message : String(error)
	};
}

/** Recomputes raisedCents for every campaign and reports any drift. */
async function checkRaisedCents() {
	const campaigns = await db.campaign.findMany({
		where: { deletedAt: null },
		select: { id: true, slug: true, raisedCents: true }
	});
	const rows = await Promise.all(
		campaigns.map(async (c) => {
			const actual = await computeRaisedCents(db, c.id);
			return { id: c.id, slug: c.slug, cached: c.raisedCents, actual, ok: c.raisedCents === actual };
		})
	);
	return { allOk: rows.every((r) => r.ok), rows };
}

export const load: PageServerLoad = async ({ url }) => {
	const zip = url.searchParams.get('zip')?.trim() ?? '';
	const species = url.searchParams.get('species')?.trim() ?? '';
	const scope = url.searchParams.get('scope')?.trim() ?? '';

	const [hospitals, fundingSources, campaigns, users, donationStatuses, recentDonations] =
		await Promise.all([
			// TTL-206 shape: find hospitals by ZIP, always-open first.
			db.vetHospital.findMany({
				where: {
					deletedAt: null,
					...(zip ? { postalCode: { startsWith: zip } } : {}),
					...(species ? { speciesServed: { contains: species } } : {})
				},
				orderBy: [{ is24Hour: 'desc' }, { isEmergency: 'desc' }, { name: 'asc' }],
				take: 20
			}),
			// TTL-308 shape: live, non-retired sources, optionally by scope.
			db.fundingSource.findMany({
				where: { retiredAt: null, ...(scope ? { scope } : {}) },
				orderBy: [{ scope: 'asc' }, { name: 'asc' }],
				take: 30
			}),
			db.campaign.findMany({
				where: { deletedAt: null },
				orderBy: { createdAt: 'desc' },
				include: {
					owner: { select: { id: true, name: true } },
					vetHospital: { select: { name: true, postalCode: true } },
					promiseToPay: { select: { accepted: true } },
					_count: { select: { donations: true } }
				}
			}),
			db.user.findMany({
				where: { isSystem: false },
				select: { id: true, name: true, email: true, isModerator: true },
				orderBy: { name: 'asc' }
			}),
			db.donation.groupBy({
				by: ['status'],
				_count: { _all: true },
				_sum: { amountCents: true }
			}),
			db.donation.findMany({
				orderBy: { createdAt: 'desc' },
				take: 12,
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
			})
		]);

	return {
		zip,
		species,
		scope,
		hospitals: hospitals.map((h) => ({
			id: h.id,
			name: h.name,
			city: h.city,
			postalCode: h.postalCode,
			phone: h.phone,
			website: h.website,
			is24Hour: h.is24Hour,
			isEmergency: h.isEmergency,
			isLowCost: h.isLowCost,
			priceTier: h.priceTier,
			emergencyHours: h.emergencyHours,
			speciesServed: h.speciesServed,
			isVerified: h.isVerified,
			verifiedAt: h.verifiedAt?.toISOString().slice(0, 10) ?? null
		})),
		fundingSources: fundingSources.map((f) => ({
			id: f.id,
			name: f.name,
			url: f.url,
			category: f.category,
			scope: f.scope,
			species: f.species,
			maxAwardNote: f.maxAwardNote,
			incomeRestricted: f.incomeRestricted,
			isVerified: f.isVerified,
			verifiedAt: f.verifiedAt?.toISOString().slice(0, 10) ?? null,
			lastCheckedAt: f.lastCheckedAt?.toISOString().slice(0, 10) ?? null,
			verifyNote: f.verifyNote
		})),
		campaigns: campaigns.map((c) => ({
			id: c.id,
			slug: c.slug,
			title: c.title,
			status: c.status,
			raisedCents: c.raisedCents,
			goalAmountCents: c.goalAmountCents,
			allowGuestDonations: c.allowGuestDonations,
			isOwnerAnonymous: c.isOwnerAnonymous,
			ownerId: c.ownerId,
			ownerName: c.owner.name,
			hospital: c.vetHospital ? `${c.vetHospital.name} ${c.vetHospital.postalCode}` : null,
			promiseAccepted: c.promiseToPay?.accepted ?? false,
			donationCount: c._count.donations
		})),
		users,
		actionUsers: ACTION_USERS,
		donationStatuses: donationStatuses
			.map((d) => ({
				status: d.status,
				count: d._count._all,
				totalCents: d._sum.amountCents ?? 0
			}))
			.sort((a, b) => b.count - a.count),
		recentDonations: recentDonations.map((d) => ({
			id: d.id,
			status: d.status,
			provider: d.provider,
			amountCents: d.amountCents,
			donor: d.isAnonymous ? 'anonymous' : (d.donorName ?? '—'),
			slug: d.campaign.slug
		})),
		raisedCentsCheck: await checkRaisedCents(),
		totals: {
			hospitals: hospitals.length,
			fundingSources: fundingSources.length,
			campaigns: campaigns.length
		}
	};
};

export const actions: Actions = {
	/**
	 * Record a donation through recordDonation(), which refreshes the
	 * raisedCents cache in the same transaction. Registered donors complete
	 * immediately; guests start PENDING so the transition can be shown after.
	 */
	donate: async ({ request }) => {
		const form = await request.formData();
		const campaignId = String(form.get('campaignId') ?? '').trim();
		const amountCents = parseDollars(form.get('amount'));
		const donorMode = String(form.get('donorMode') ?? 'guest');
		const asUser = String(form.get('asUser') ?? ACTION_USERS[0]);

		if (!campaignId || amountCents === null || amountCents <= 0) {
			return fail(400, {
				donation: bad(
					'Donation rejected before touching the database',
					new ValidationError('Pick a campaign and enter a positive amount.')
				)
			});
		}

		try {
			const donation = await recordDonation({
				campaignId,
				amountCents,
				status: donorMode === 'user' ? 'COMPLETED' : 'PENDING',
				provider: 'SIMULATED',
				providerRef: `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
				donorUserId: donorMode === 'user' ? asUser : null,
				donorName: donorMode === 'guest' ? String(form.get('donorName') ?? '').trim() || 'Anonymous' : null,
				isAnonymous: form.get('isAnonymous') === 'on',
				message: String(form.get('message') ?? '').trim() || null
			});
			const campaign = await db.campaign.findUnique({
				where: { id: donation.campaignId },
				select: { raisedCents: true, slug: true }
			});
			return {
				donation: ok(
					`Donation of ${dollars(donation.amountCents)} recorded`,
					`${donation.status} via ${donation.provider} on ${campaign?.slug}. That campaign now shows ${dollars(campaign?.raisedCents)} — recomputed from COMPLETED donations inside the same transaction.`
				)
			};
		} catch (error) {
			return fail(400, { donation: bad('recordDonation refused', error) });
		}
	},

	/** PENDING -> COMPLETED / REFUNDED / FAILED, keeping the cache consistent. */
	transition: async ({ request }) => {
		const form = await request.formData();
		const donationId = String(form.get('donationId') ?? '').trim();
		const status = String(form.get('status') ?? '').trim();
		if (!donationId || !status) {
			return fail(400, {
				donation: bad(
					'Transition rejected',
					new ValidationError('Choose a donation and a target status.')
				)
			});
		}
		try {
			const updated = await setDonationStatus(donationId, status as 'COMPLETED');
			const campaign = await db.campaign.findUnique({
				where: { id: updated.campaignId },
				select: { raisedCents: true, slug: true }
			});
			return {
				donation: ok(
					`Donation is now ${updated.status}`,
					`${campaign?.slug} total moved to ${dollars(campaign?.raisedCents)}.`
				)
			};
		} catch (error) {
			return fail(400, { donation: bad('setDonationStatus refused', error) });
		}
	},

	/** requireCampaignAccess: OWNER/MANAGER pass, VIEWER/PENDING/outsiders do not. */
	access: async ({ request }) => {
		const form = await request.formData();
		const campaignId = String(form.get('campaignId') ?? '');
		const userId = String(form.get('asUser') ?? ACTION_USERS[0]);
		try {
			const access = await requireCampaignAccess(campaignId, userId);
			return {
				access: ok(
					`${userId} may manage this campaign`,
					`requireCampaignAccess resolved with role ${access.role}.`
				)
			};
		} catch (error) {
			return fail(403, { access: bad(`requireCampaignAccess refused ${userId}`, error) });
		}
	},

	/** requireCampaignOwner: co-managers are NOT enough. */
	owner: async ({ request }) => {
		const form = await request.formData();
		const campaignId = String(form.get('campaignId') ?? '');
		const userId = String(form.get('asUser') ?? ACTION_USERS[0]);
		try {
			await requireCampaignOwner(campaignId, userId);
			return {
				access: ok(`${userId} owns this campaign`, 'requireCampaignOwner resolved.')
			};
		} catch (error) {
			return fail(403, { access: bad(`requireCampaignOwner refused ${userId}`, error) });
		}
	},

	/**
	 * acceptPromiseToPay: owner-only, and the money must add up
	 * (ttlCoversCents + ownerMaxObligationCents === billAmountCents).
	 */
	promise: async ({ request }) => {
		const form = await request.formData();
		const campaignId = String(form.get('campaignId') ?? '');
		const userId = String(form.get('asUser') ?? ACTION_USERS[0]);
		const bill = parseDollars(form.get('billAmount'));
		const ttlCovers = parseDollars(form.get('ttlCovers'));
		const ownerMax = parseDollars(form.get('ownerMax'));
		if (bill === null || ttlCovers === null || ownerMax === null) {
			return fail(400, {
				promise: bad(
					'Promise rejected',
					new ValidationError('Bill, TakeTheLead covers, and owner max are all required.')
				)
			});
		}
		try {
			const promise = await acceptPromiseToPay({
				campaignId,
				userId,
				billAmountCents: bill,
				ttlCoversCents: ttlCovers,
				ownerMaxObligationCents: ownerMax,
				ttlCoversText: String(form.get('ttlCoversText') ?? '').trim(),
				ownerObligationText: String(form.get('ownerObligationText') ?? '').trim(),
				termsVersion: 'test'
			});
			return {
				promise: ok(
					`Promise accepted for ${campaignId}`,
					`${dollars(promise.ttlCoversCents)} covered by TakeTheLead + ${dollars(promise.ownerMaxObligationCents)} owed by the owner = ${dollars(promise.billAmountCents)} bill. Campaign.billAmountCents was synced in the same transaction.`
				)
			};
		} catch (error) {
			return fail(400, { promise: bad('acceptPromiseToPay refused', error) });
		}
	},

	/**
	 * moderateCampaign: writes the immutable review row and moves the status.
	 * Approving a campaign whose promise is not accepted must fail (TTL-211).
	 */
	moderate: async ({ request }) => {
		const form = await request.formData();
		const campaignId = String(form.get('campaignId') ?? '');
		const reviewerId = String(form.get('asUser') ?? 'seed_mod');
		const decision = String(form.get('decision') ?? '') as 'APPROVED';
		const reason = String(form.get('reason') ?? '').trim();
		try {
			const result = await moderateCampaign(campaignId, reviewerId, decision, reason || undefined);
			return {
				moderation: ok(
					`${decision} recorded for ${campaignId}`,
					`Campaign.status is now ${result.campaign.status}. Review ${result.review.id} written by ${reviewerId}.`
				)
			};
		} catch (error) {
			return fail(400, { moderation: bad(`${decision} blocked for ${campaignId}`, error) });
		}
	},

	/** Self-heal the raisedCents cache for every campaign. */
	recompute: async () => {
		const campaigns = await db.campaign.findMany({
			where: { deletedAt: null },
			select: { id: true }
		});
		for (const c of campaigns) {
			await db.campaign.update({
				where: { id: c.id },
				data: { raisedCents: await computeRaisedCents(db, c.id) }
			});
		}
		const check = await checkRaisedCents();
		return {
			raisedCentsCheck: check,
			recompute: ok(
				`Recomputed ${campaigns.length} campaigns`,
				check.allOk
					? 'Every raisedCents cache equals SUM(COMPLETED donations).'
					: 'Some rows still disagree — see the consistency table.'
			)
		};
	}
};
