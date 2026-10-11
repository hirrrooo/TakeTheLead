/**
 * Server-only guarded mutations & access checks.
 * Every write that touches an invariant (raisedCents, ownership, moderation
 * state, promise-to-pay) MUST go through these helpers so the invariant holds
 * in one place.
 */
import { db } from '$lib/server/db';
import type { Prisma } from '../../../../generated/prisma/client';
import type {
	CampaignStatus,
	DonationProvider,
	DonationStatus,
	MemberRole,
	ReviewDecision
} from '../enums';

// ---------- Errors ----------

export class AccessDeniedError extends Error {
	constructor(message = 'Access denied') {
		super(message);
		this.name = 'AccessDeniedError';
	}
}

export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ValidationError';
	}
}

// ---------- Invariant: raisedCents ----------

/**
 * Sum of COMPLETED donation cents for a campaign — the single source of truth
 * against which the Campaign.raisedCents cache is written.
 */
export async function computeRaisedCents(
	tx: Prisma.TransactionClient,
	campaignId: string
): Promise<number> {
	const agg = await tx.donation.aggregate({
		where: { campaignId, status: 'COMPLETED' },
		_sum: { amountCents: true }
	});
	return agg._sum.amountCents ?? 0;
}

export interface RecordDonationInput {
	campaignId: string;
	amountCents: number;
	status?: DonationStatus;
	provider?: DonationProvider;
	providerRef?: string;
	donorUserId?: string | null;
	donorName?: string | null;
	isAnonymous?: boolean;
	message?: string | null;
	currency?: string;
	feeCents?: number;
}

/**
 * Create a donation and refresh Campaign.raisedCents in the SAME transaction.
 * The cache is always recomputed from the aggregate (never incremented) so it
 * self-heals if it ever drifts.
 */
export async function recordDonation(input: RecordDonationInput) {
	if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
		throw new ValidationError('Donation amountCents must be a positive integer');
	}

	return db.$transaction(async (tx) => {
		const campaign = await tx.campaign.findUnique({
			where: { id: input.campaignId },
			select: { id: true, allowGuestDonations: true, deletedAt: true, status: true }
		});
		if (!campaign || campaign.deletedAt) throw new ValidationError('Campaign not found');
		if (campaign.status !== 'APPROVED') throw new ValidationError('This campaign is not live');
		if (!input.donorUserId && !campaign.allowGuestDonations) {
			throw new AccessDeniedError('This campaign does not accept guest donations');
		}

		const now = new Date();
		const initialStatus = input.status ?? 'PENDING';
		const donation = await tx.donation.create({
			data: {
				campaignId: input.campaignId,
				amountCents: input.amountCents,
				status: initialStatus,
				provider: input.provider ?? 'MANUAL',
				providerRef: input.providerRef,
				donorUserId: input.donorUserId ?? null,
				donorName: input.donorName ?? null,
				isAnonymous: input.isAnonymous ?? false,
				message: input.message ?? null,
				currency: input.currency ?? 'usd',
				feeCents: input.feeCents ?? 0,
				completedAt: initialStatus === 'COMPLETED' ? now : null
			}
		});

		const raisedCents = await computeRaisedCents(tx, input.campaignId);
		await tx.campaign.update({ where: { id: input.campaignId }, data: { raisedCents } });

		return donation;
	});
}

/**
 * Transition a donation's status (e.g. webhook PENDING -> COMPLETED, refund)
 * and keep the raisedCents cache consistent.
 */
export async function setDonationStatus(donationId: string, status: DonationStatus) {
	return db.$transaction(async (tx) => {
		const donation = await tx.donation.findUnique({ where: { id: donationId } });
		if (!donation) throw new ValidationError('Donation not found');

		const now = new Date();
		const updated = await tx.donation.update({
			where: { id: donationId },
			data: {
				status,
				completedAt: status === 'COMPLETED' ? (donation.completedAt ?? now) : donation.completedAt,
				refundedAt: status === 'REFUNDED' ? now : donation.refundedAt
			}
		});

		const raisedCents = await computeRaisedCents(tx, donation.campaignId);
		await tx.campaign.update({ where: { id: donation.campaignId }, data: { raisedCents } });

		return updated;
	});
}

// ---------- Access control ----------

export interface CampaignAccess {
	campaignId: string;
	userId: string;
	role: MemberRole;
}

/**
 * Throws AccessDeniedError unless `userId` is an ACCEPTED OWNER or MANAGER
 * of the campaign. VIEWER / PENDING / REVOKED / non-members are rejected.
 * Returns the caller's role so callers can further narrow permissions.
 */
export async function requireCampaignAccess(
	campaignId: string,
	userId: string
): Promise<CampaignAccess> {
	const member = await db.campaignMember.findUnique({
		where: { campaignId_userId: { campaignId, userId } }
	});
	if (!member || member.status !== 'ACCEPTED') {
		throw new AccessDeniedError('You are not a manager of this campaign');
	}
	if (member.role !== 'OWNER' && member.role !== 'MANAGER') {
		throw new AccessDeniedError('This action requires an OWNER or MANAGER role');
	}
	return { campaignId, userId, role: member.role as MemberRole };
}

/**
 * Throws unless `userId` owns the campaign. Co-managers are NOT enough —
 * used for owner-only actions such as accepting the promise-to-pay (TTL-211).
 */
export async function requireCampaignOwner(campaignId: string, userId: string) {
	const member = await db.campaignMember.findUnique({
		where: { campaignId_userId: { campaignId, userId } }
	});
	if (!member || member.status !== 'ACCEPTED' || member.role !== 'OWNER') {
		throw new AccessDeniedError('Only the campaign owner can do this');
	}
	return { campaignId, userId, role: 'OWNER' as const };
}

// ---------- Ownership (dual-write) ----------

/**
 * Transfer campaign ownership atomically: Campaign.ownerId AND the
 * CampaignMember rows stay in sync (new user becomes ACCEPTED OWNER, the
 * previous OWNER row is demoted to ACCEPTED MANAGER so they keep co-management).
 */
export async function setCampaignOwner(campaignId: string, newOwnerId: string) {
	return db.$transaction(async (tx) => {
		const campaign = await tx.campaign.findUnique({
			where: { id: campaignId },
			include: { members: { where: { role: 'OWNER', status: 'ACCEPTED' } } }
		});
		if (!campaign) throw new ValidationError('Campaign not found');

		// Demote current owner member row(s) to MANAGER
		if (campaign.members.length > 0) {
			await tx.campaignMember.updateMany({
				where: { campaignId, role: 'OWNER', status: 'ACCEPTED' },
				data: { role: 'MANAGER' }
			});
		}

		// Promote (or create) the new owner's member row
		await tx.campaignMember.upsert({
			where: { campaignId_userId: { campaignId, userId: newOwnerId } },
			update: { role: 'OWNER', status: 'ACCEPTED', joinedAt: new Date() },
			create: { campaignId, userId: newOwnerId, role: 'OWNER', status: 'ACCEPTED' }
		});

		return tx.campaign.update({ where: { id: campaignId }, data: { ownerId: newOwnerId } });
	});
}

// ---------- Promise to pay (TTL-211) ----------

export interface AcceptPromiseToPayInput {
	campaignId: string;
	userId: string;
	billAmountCents: number;
	ttlCoversCents?: number | null;
	ownerMaxObligationCents: number;
	ttlCoversText: string;
	ownerObligationText: string;
	termsVersion?: string;
}

/**
 * Record the owner's acceptance of the plain-language promise-to-pay terms.
 * Only the OWNER may accept, and the money must add up: the bill equals what
 * TakeTheLead covers plus the most the owner can still owe.
 */
export async function acceptPromiseToPay(input: AcceptPromiseToPayInput) {
	if (!Number.isInteger(input.billAmountCents) || input.billAmountCents < 0) {
		throw new ValidationError('billAmountCents must be a non-negative integer');
	}
	if (!Number.isInteger(input.ownerMaxObligationCents) || input.ownerMaxObligationCents < 0) {
		throw new ValidationError('ownerMaxObligationCents must be a non-negative integer');
	}
	const ttlCovers = input.ttlCoversCents ?? 0;
	if (!Number.isInteger(ttlCovers) || ttlCovers < 0) {
		throw new ValidationError('ttlCoversCents must be a non-negative integer');
	}
	if (ttlCovers + input.ownerMaxObligationCents !== input.billAmountCents) {
		throw new ValidationError(
			'ttlCoversCents + ownerMaxObligationCents must equal billAmountCents'
		);
	}
	if (!input.ttlCoversText.trim() || !input.ownerObligationText.trim()) {
		throw new ValidationError('Both plain-language summaries are required');
	}

	await requireCampaignOwner(input.campaignId, input.userId);

	const now = new Date();
	return db.$transaction(async (tx) => {
		const promise = await tx.promiseToPay.upsert({
			where: { campaignId: input.campaignId },
			update: {
				billAmountCents: input.billAmountCents,
				ttlCoversCents: ttlCovers,
				ownerMaxObligationCents: input.ownerMaxObligationCents,
				ttlCoversText: input.ttlCoversText,
				ownerObligationText: input.ownerObligationText,
				accepted: true,
				acceptedAt: now,
				acceptedBy: input.userId,
				termsVersion: input.termsVersion ?? '2026-10',
				updatedAt: now
			},
			create: {
				campaignId: input.campaignId,
				billAmountCents: input.billAmountCents,
				ttlCoversCents: ttlCovers,
				ownerMaxObligationCents: input.ownerMaxObligationCents,
				ttlCoversText: input.ttlCoversText,
				ownerObligationText: input.ownerObligationText,
				accepted: true,
				acceptedAt: now,
				acceptedBy: input.userId,
				termsVersion: input.termsVersion ?? '2026-10'
			}
		});
		// Keep the campaign's bill figure in sync with the accepted promise.
		await tx.campaign.update({
			where: { id: input.campaignId },
			data: { billAmountCents: input.billAmountCents }
		});
		return promise;
	});
}

/** True only when an ACCEPTED promise-to-pay exists for the campaign. */
export async function hasAcceptedPromiseToPay(campaignId: string): Promise<boolean> {
	const promise = await db.promiseToPay.findUnique({
		where: { campaignId },
		select: { accepted: true }
	});
	return promise?.accepted === true;
}

// ---------- Moderation ----------

const DECISION_TO_CAMPAIGN_STATUS: Record<ReviewDecision, CampaignStatus> = {
	APPROVED: 'APPROVED',
	REJECTED: 'REJECTED',
	CHANGES_REQUESTED: 'DRAFT'
};

/**
 * Record a moderation decision: inserts the immutable CampaignReview row and
 * moves Campaign.status in the same transaction. Review facts (who/when/why)
 * live ONLY on the review row.
 *
 * Invariant (TTL-211): a campaign cannot be APPROVED without an accepted
 * promise-to-pay.
 */
export async function moderateCampaign(
	campaignId: string,
	reviewerId: string,
	decision: ReviewDecision,
	reason?: string
) {
	return db.$transaction(async (tx) => {
		const campaign = await tx.campaign.findUnique({
			where: { id: campaignId },
			select: { id: true }
		});
		if (!campaign) throw new ValidationError('Campaign not found');

		if (decision === 'APPROVED') {
			const promise = await tx.promiseToPay.findUnique({
				where: { campaignId },
				select: { accepted: true }
			});
			if (!promise?.accepted) {
				throw new ValidationError(
					'Cannot approve: the owner has not accepted the promise-to-pay terms'
				);
			}
		}

		const review = await tx.campaignReview.create({
			data: { campaignId, reviewerId, decision, reason: reason ?? null }
		});

		const status: CampaignStatus = DECISION_TO_CAMPAIGN_STATUS[decision];
		const updated = await tx.campaign.update({
			where: { id: campaignId },
			data: {
				status,
				publishedAt: status === 'APPROVED' ? new Date() : undefined
			}
		});

		return { review, campaign: updated };
	});
}
