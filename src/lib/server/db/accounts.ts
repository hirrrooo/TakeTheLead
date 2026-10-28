/**
 * Server-only reads for the Better Auth tables (users, credential accounts,
 * sessions) plus the raisedCents cache audit/self-heal used by the developer
 * bench. These live here — not inside a route — so any future surface (an
 * account settings page, a moderation/admin queue, or an ops script) reaches
 * the same guarded helpers instead of re-querying Prisma by hand.
 *
 * SECURITY: listCredentialAccounts() never returns a raw password hash. The
 * preview it produces is enough to prove a value is a scrypt hash without
 * shipping the hash itself to a browser.
 */
import { db } from '$lib/server/db';
import { computeRaisedCents } from '$lib/server/db/queries';

/** The seeded orphan owner — excluded from every user-facing listing. */
const SYSTEM_USER_ID = 'system';

export interface CredentialAccountSummary {
	id: string;
	accountId: string;
	providerId: string;
	userId: string;
	/** e.g. "scrypt$1024$64… (128 chars)", or null when the provider has no password. */
	passwordPreview: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * Credential (and future OAuth) account rows for real members. The password
 * column holds Better Auth's scrypt hash; only a length-bearing prefix is
 * exposed so callers can prove hashing without leaking the secret.
 */
export async function listCredentialAccounts(): Promise<CredentialAccountSummary[]> {
	const accounts = await db.account.findMany({
		where: { userId: { not: SYSTEM_USER_ID } },
		select: {
			id: true,
			accountId: true,
			providerId: true,
			userId: true,
			password: true,
			createdAt: true,
			updatedAt: true
		},
		orderBy: { createdAt: 'asc' }
	});

	return accounts.map((a) => ({
		id: a.id,
		accountId: a.accountId,
		providerId: a.providerId,
		userId: a.userId,
		passwordPreview: a.password ? `${a.password.slice(0, 12)}… (${a.password.length} chars)` : null,
		createdAt: a.createdAt.toISOString(),
		updatedAt: a.updatedAt.toISOString()
	}));
}

export interface MemberUserSummary {
	id: string;
	name: string | null;
	email: string;
	isModerator: boolean;
}

/**
 * Real members (the seeded `system` owner is excluded). Safe to surface: no
 * auth columns are selected.
 */
export async function listMemberUsers(): Promise<MemberUserSummary[]> {
	return db.user.findMany({
		where: { isSystem: false },
		select: { id: true, name: true, email: true, isModerator: true },
		orderBy: { name: 'asc' }
	});
}

export interface ActiveSessionSummary {
	id: string;
	userId: string;
	userName: string;
	expiresAt: string;
	createdAt: string;
	ipAddress: string | null;
	userAgent: string | null;
}

/** Sessions that have not expired, newest first. */
export async function listActiveSessions(limit = 15): Promise<ActiveSessionSummary[]> {
	const sessions = await db.session.findMany({
		where: { expiresAt: { gt: new Date() } },
		select: {
			id: true,
			userId: true,
			expiresAt: true,
			createdAt: true,
			ipAddress: true,
			userAgent: true,
			user: { select: { name: true } }
		},
		orderBy: { createdAt: 'desc' },
		take: limit
	});

	return sessions.map((s) => ({
		id: s.id,
		userId: s.userId,
		userName: s.user.name ?? s.userId,
		expiresAt: s.expiresAt.toISOString(),
		createdAt: s.createdAt.toISOString(),
		ipAddress: s.ipAddress,
		userAgent: s.userAgent
	}));
}

export interface RaisedCentsRow {
	id: string;
	slug: string;
	cached: number;
	actual: number;
	ok: boolean;
}

export interface RaisedCentsAudit {
	allOk: boolean;
	rows: RaisedCentsRow[];
}

/** Compares every campaign's cached raisedCents against SUM(COMPLETED). */
export async function checkRaisedCentsConsistency(): Promise<RaisedCentsAudit> {
	const campaigns = await db.campaign.findMany({
		where: { deletedAt: null },
		select: { id: true, slug: true, raisedCents: true }
	});
	const rows = await Promise.all(
		campaigns.map(async (c) => {
			const actual = await computeRaisedCents(db, c.id);
			return {
				id: c.id,
				slug: c.slug,
				cached: c.raisedCents,
				actual,
				ok: c.raisedCents === actual
			};
		})
	);
	return { allOk: rows.every((r) => r.ok), rows };
}

/**
 * Self-heal: rewrite every campaign's raisedCents cache from the donation
 * aggregate, then re-audit. Returns the post-repair audit.
 */
export async function recomputeAllRaisedCentsCaches(): Promise<{
	recomputed: number;
	audit: RaisedCentsAudit;
}> {
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
	return { recomputed: campaigns.length, audit: await checkRaisedCentsConsistency() };
}
