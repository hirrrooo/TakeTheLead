/**
 * Server-only guarded mutations & access checks.
 * Every write that touches an invariant (raisedCents, ownership, moderation
 * state) MUST go through these helpers so the invariant holds in one place.
 */
import { db } from '$lib/server/db';
import type { Prisma } from '../../../../../generated/prisma/client';
import type {
	DonationProvider,
	DonationStatus,
	MemberRole,
	ReviewDecision,
	StoryStatus
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
 * Sum of COMPLETED donation cents for a story — the single source of truth
 * against which the Story.raisedCents cache is written.
 */
export async function computeRaisedCents(
	tx: Prisma.TransactionClient,
	storyId: string
): Promise<number> {
	const agg = await tx.donation.aggregate({
		where: { storyId, status: 'COMPLETED' },
		_sum: { amountCents: true }
	});
	return agg._sum.amountCents ?? 0;
}

export interface RecordDonationInput {
	storyId: string;
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
 * Create a donation and refresh Story.raisedCents in the SAME transaction.
 * The cache is always recomputed from the aggregate (never incremented) so it
 * self-heals if it ever drifts.
 */
export async function recordDonation(input: RecordDonationInput) {
	if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
		throw new ValidationError('Donation amountCents must be a positive integer');
	}

	return db.$transaction(async (tx) => {
		const story = await tx.story.findUnique({
			where: { id: input.storyId },
			select: { id: true, allowGuestDonations: true, deletedAt: true }
		});
		if (!story || story.deletedAt) throw new ValidationError('Story not found');
		if (!input.donorUserId && !story.allowGuestDonations) {
			throw new AccessDeniedError('This story does not accept guest donations');
		}

		const now = new Date();
		const initialStatus = input.status ?? 'PENDING';
		const donation = await tx.donation.create({
			data: {
				storyId: input.storyId,
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

		const raisedCents = await computeRaisedCents(tx, input.storyId);
		await tx.story.update({ where: { id: input.storyId }, data: { raisedCents } });

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

		const raisedCents = await computeRaisedCents(tx, donation.storyId);
		await tx.story.update({ where: { id: donation.storyId }, data: { raisedCents } });

		return updated;
	});
}

// ---------- Access control ----------

export interface StoryAccess {
	storyId: string;
	userId: string;
	role: MemberRole;
}

/**
 * Throws AccessDeniedError unless `userId` is an ACCEPTED OWNER or MANAGER
 * of the story. VIEWER / PENDING / REVOKED / non-members are rejected.
 * Returns the caller's role so callers can further narrow permissions.
 */
export async function requireStoryAccess(storyId: string, userId: string): Promise<StoryAccess> {
	const member = await db.storyMember.findUnique({
		where: { storyId_userId: { storyId, userId } }
	});
	if (!member || member.status !== 'ACCEPTED') {
		throw new AccessDeniedError('You are not a manager of this story');
	}
	if (member.role !== 'OWNER' && member.role !== 'MANAGER') {
		throw new AccessDeniedError('This action requires an OWNER or MANAGER role');
	}
	return { storyId, userId, role: member.role as MemberRole };
}

// ---------- Ownership (dual-write) ----------

/**
 * Transfer story ownership atomically: Story.ownerId AND the StoryMember
 * rows stay in sync (new user becomes ACCEPTED OWNER, previous OWNER row is
 * demoted to ACCEPTED MANAGER so they keep co-management if desired).
 */
export async function setStoryOwner(storyId: string, newOwnerId: string) {
	return db.$transaction(async (tx) => {
		const story = await tx.story.findUnique({
			where: { id: storyId },
			include: { members: { where: { role: 'OWNER', status: 'ACCEPTED' } } }
		});
		if (!story) throw new ValidationError('Story not found');

		// Demote current owner member row(s) to MANAGER
		if (story.members.length > 0) {
			await tx.storyMember.updateMany({
				where: { storyId, role: 'OWNER', status: 'ACCEPTED' },
				data: { role: 'MANAGER' }
			});
		}

		// Promote (or create) the new owner's member row
		await tx.storyMember.upsert({
			where: { storyId_userId: { storyId, userId: newOwnerId } },
			update: { role: 'OWNER', status: 'ACCEPTED', joinedAt: new Date() },
			create: { storyId, userId: newOwnerId, role: 'OWNER', status: 'ACCEPTED' }
		});

		return tx.story.update({ where: { id: storyId }, data: { ownerId: newOwnerId } });
	});
}

// ---------- Moderation ----------

const DECISION_TO_STORY_STATUS: Record<ReviewDecision, StoryStatus> = {
	APPROVED: 'APPROVED',
	REJECTED: 'REJECTED',
	CHANGES_REQUESTED: 'DRAFT'
};

/**
 * Record a moderation decision: inserts the immutable StoryReview row and
 * moves Story.status in the same transaction. Review facts (who/when/why)
 * live ONLY on the review row.
 */
export async function moderateStory(
	storyId: string,
	reviewerId: string,
	decision: ReviewDecision,
	reason?: string
) {
	return db.$transaction(async (tx) => {
		const story = await tx.story.findUnique({ where: { id: storyId }, select: { id: true } });
		if (!story) throw new ValidationError('Story not found');

		const review = await tx.storyReview.create({
			data: { storyId, reviewerId, decision, reason: reason ?? null }
		});

		const status: StoryStatus = DECISION_TO_STORY_STATUS[decision];
		const updated = await tx.story.update({
			where: { id: storyId },
			data: {
				status,
				publishedAt: status === 'APPROVED' ? new Date() : undefined
			}
		});

		return { review, story: updated };
	});
}
