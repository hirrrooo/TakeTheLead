/**
 * TakeTheLead demo seed (TTL-208).
 *
 * This file contains NO data â€” every row lives in `seed-data.ts`. Its only job
 * is to apply that data to the database safely:
 *
 *   npm run db:seed
 *
 * Guarantees
 * ----------
 * - Idempotent: fixed `seed_*` ids and upserts, so re-running changes nothing.
 * - Self-healing: rows deleted since the last run are re-created, and stale
 *   demo rows (e.g. after a campaign is removed from the data file) are pruned.
 * - FK-safe order: users -> accounts -> hospitals -> funding sources -> pets ->
 *   campaigns -> links -> promise-to-pay -> donations -> vet records -> reviews.
 * - `raisedCents` is always RECOMPUTED from COMPLETED donations, never copied
 *   from the data file, so the cache cannot drift.
 * - The invariants enforced by the guarded query layer are asserted before
 *   writing, so a bad edit to seed-data.ts fails loudly instead of seeding
 *   rows the app itself would refuse to create.
 *
 * Demo logins all share SEED_PASSWORD from seed-data.ts.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { hashPassword } from 'better-auth/crypto';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import {
	SEED_PASSWORD,
	CHECKED_AT,
	FUNDING_SOURCE_TARGETS,
	seedCampaignPets,
	seedCampaigns,
	seedDonations,
	seedFundingSources,
	seedHospitals,
	seedImages,
	seedMembers,
	seedPets,
	seedPromisesToPay,
	seedReviews,
	seedUsers,
	seedVetRecords
} from './seed-data.ts';

// Same default as prisma7.config.ts so `npm run db:seed` works without a .env.
const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

/** Deterministic fake provider refs so re-runs do not collide on @unique. */
const ref = (name: string) => createHash('sha1').update(name).digest('hex').slice(0, 16);

function daysAgo(n: number): Date {
	return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function assert(condition: boolean, message: string): void {
	if (!condition) throw new Error(`seed-data invariant: ${message}`);
}

/**
 * Consistency checks that mirror the rules in src/lib/server/db/queries. A
 * failure here means seed-data.ts was edited into an impossible state.
 */
function validateData(): void {
	assert(
		seedFundingSources.length === FUNDING_SOURCE_TARGETS.total,
		`expected ${FUNDING_SOURCE_TARGETS.total} funding sources (${FUNDING_SOURCE_TARGETS.starter} starter + ${FUNDING_SOURCE_TARGETS.added} added), got ${seedFundingSources.length}`
	);
	const urls = new Set(seedFundingSources.map((f) => f.url));
	assert(urls.size === seedFundingSources.length, 'funding source urls must be unique');
	assert(
		seedFundingSources.every((f) => f.isVerified && f.verifyNote.trim().length > 0),
		'every funding source needs isVerified plus a verifyNote saying when the link was checked'
	);

	const alwaysOpen = seedHospitals.filter((h) => h.is24Hour);
	assert(
		alwaysOpen.length === 1,
		`exactly one Hampton Roads hospital is genuinely open 24/7, got ${alwaysOpen.length}`
	);
	assert(
		seedHospitals.every((h) => !h.isEmergency || (h.emergencyHours ?? '').length > 0),
		'every emergency hospital needs emergencyHours so owners are not misled about overnight cover'
	);
	assert(
		seedHospitals.every(
			(h) => /^\d{5}$/.test(h.postalCode) && /^\(\d{3}\) \d{3}-\d{4}$/.test(h.phone)
		),
		'every hospital needs a 5-digit ZIP and a (757) 555-0123 style phone'
	);

	const campaignIds = new Set(seedCampaigns.map((c) => c.id));
	for (const p of seedPromisesToPay) {
		assert(campaignIds.has(p.campaignId), `promise ${p.id} points at an unknown campaign`);
		if (!p.accepted) continue;
		const ttl = p.ttlCoversCents ?? 0;
		assert(
			ttl + p.ownerMaxObligationCents === p.billAmountCents,
			`${p.id}: ttlCoversCents + ownerMaxObligationCents must equal billAmountCents`
		);
		assert(p.ownerMaxObligationCents >= 0, `${p.id}: ownerMaxObligationCents cannot be negative`);
		assert(p.acceptedBy !== null, `${p.id}: an accepted promise needs acceptedBy`);
	}

	// TTL-211: a publishable campaign must have an accepted promise to pay.
	const accepted = new Set(seedPromisesToPay.filter((p) => p.accepted).map((p) => p.campaignId));
	for (const c of seedCampaigns) {
		if (c.status === 'APPROVED' || c.status === 'CLOSED') {
			assert(accepted.has(c.id), `${c.id} is ${c.status} but has no accepted promise to pay`);
		}
	}

	const donationIds = new Set(seedDonations.map((d) => d.id));
	assert(donationIds.size === seedDonations.length, 'donation ids must be unique');
	for (const d of seedDonations) {
		assert(campaignIds.has(d.campaignId), `donation ${d.id} points at an unknown campaign`);
		assert(d.amountCents > 0, `donation ${d.id} must be a positive amount`);
		if (d.donorUserId === null) {
			assert((d.donorName ?? '').length > 0, `guest donation ${d.id} needs a donorName`);
		}
	}
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function applyUsers(): Promise<number> {
	for (const u of seedUsers) {
		await db.user.upsert({
			where: { id: u.id },
			update: { name: u.name, email: u.email, isSystem: u.isSystem, isModerator: u.isModerator },
			create: { ...u, emailVerified: true }
		});
	}

	// Loginable credential accounts (Better Auth schema). The system user cannot log in.
	const hash = await hashPassword(SEED_PASSWORD);
	for (const u of seedUsers.filter((x) => !x.isSystem)) {
		await db.account.upsert({
			where: { id: `seed_acc_${u.id}` },
			update: { password: hash, updatedAt: new Date() },
			create: {
				id: `seed_acc_${u.id}`,
				accountId: u.id,
				providerId: 'credential',
				userId: u.id,
				password: hash
			}
		});
	}
	return seedUsers.length;
}

async function seedHospitalsDirectory(): Promise<number> {
	for (const h of seedHospitals) {
		await db.vetHospital.upsert({ where: { id: h.id }, update: { ...h }, create: { ...h } });
	}
	// Hygiene timestamps are stamped here rather than stored in the data file, so
	// CHECKED_AT stays the single provenance knob.
	await db.vetHospital.updateMany({
		where: { id: { in: seedHospitals.filter((h) => h.isVerified).map((h) => h.id) } },
		data: { verifiedAt: CHECKED_AT, lastCheckedAt: CHECKED_AT }
	});
	return seedHospitals.length;
}

async function seedFundingDirectory(): Promise<number> {
	for (const f of seedFundingSources) {
		await db.fundingSource.upsert({ where: { id: f.id }, update: { ...f }, create: { ...f } });
	}
	// TTL-208: verifiedAt is only ever set for a link a human actually loaded.
	await db.fundingSource.updateMany({
		where: { id: { in: seedFundingSources.filter((f) => f.isVerified).map((f) => f.id) } },
		data: { verifiedAt: CHECKED_AT, lastCheckedAt: CHECKED_AT }
	});
	return seedFundingSources.length;
}

async function seedPetsTable(): Promise<number> {
	for (const p of seedPets) {
		await db.pet.upsert({ where: { id: p.id }, update: { ...p }, create: { ...p } });
	}
	return seedPets.length;
}

async function seedCampaignsTable(): Promise<number> {
	for (const c of seedCampaigns) {
		await db.campaign.upsert({ where: { id: c.id }, update: { ...c }, create: { ...c } });
	}
	return seedCampaigns.length;
}

async function seedCampaignLinks(): Promise<number> {
	for (const link of seedCampaignPets) {
		await db.campaignPet.upsert({
			where: { campaignId_petId: { campaignId: link.campaignId, petId: link.petId } },
			update: { role: link.role },
			create: { campaignId: link.campaignId, petId: link.petId, role: link.role }
		});
	}
	for (const m of seedMembers) {
		await db.campaignMember.upsert({
			where: { campaignId_userId: { campaignId: m.campaignId, userId: m.userId } },
			update: { role: m.role, status: m.status, invitedById: m.invitedById },
			create: { ...m }
		});
	}
	for (const img of seedImages) {
		await db.campaignImage.upsert({
			where: { id: img.id },
			update: { ...img },
			create: { ...img }
		});
	}
	return seedCampaignPets.length + seedMembers.length + seedImages.length;
}

async function seedPromisesToPayTable(): Promise<number> {
	for (const p of seedPromisesToPay) {
		const data = {
			billAmountCents: p.billAmountCents,
			ttlCoversCents: p.ttlCoversCents,
			ownerMaxObligationCents: p.ownerMaxObligationCents,
			ttlCoversText: p.ttlCoversText,
			ownerObligationText: p.ownerObligationText,
			accepted: p.accepted,
			acceptedBy: p.acceptedBy,
			acceptedAt: p.accepted ? CHECKED_AT : null,
			termsVersion: p.termsVersion
		};
		await db.promiseToPay.upsert({
			where: { campaignId: p.campaignId },
			update: data,
			create: { id: p.id, campaignId: p.campaignId, ...data }
		});
	}
	return seedPromisesToPay.length;
}

async function seedDonationsTable(): Promise<number> {
	for (const d of seedDonations) {
		const completedAt = d.status === 'COMPLETED' || d.status === 'REFUNDED' ? daysAgo(5) : null;
		const refundedAt = d.status === 'REFUNDED' ? daysAgo(2) : null;
		await db.donation.upsert({
			where: { id: d.id },
			update: { ...d, completedAt, refundedAt },
			create: { ...d, providerRef: ref(d.id), currency: 'usd', completedAt, refundedAt }
		});
	}
	return seedDonations.length;
}

async function seedVetRecordsTable(): Promise<number> {
	for (const r of seedVetRecords) {
		await db.vetRecord.upsert({ where: { id: r.id }, update: { ...r }, create: { ...r } });
	}
	return seedVetRecords.length;
}

async function seedReviewsTable(): Promise<number> {
	for (const r of seedReviews) {
		await db.campaignReview.upsert({ where: { id: r.id }, update: { ...r }, create: { ...r } });
	}
	return seedReviews.length;
}

/**
 * raisedCents is a cache of SUM(COMPLETED donations). Recomputing it from the
 * donations table, rather than trusting any stored value, keeps the seed
 * self-healing if a donation is edited by hand.
 */
async function recomputeRaisedCents(): Promise<number> {
	const sums = await db.donation.groupBy({
		by: ['campaignId'],
		where: { status: 'COMPLETED' },
		_sum: { amountCents: true }
	});
	const byCampaign = new Map(sums.map((s) => [s.campaignId, s._sum.amountCents ?? 0]));

	for (const campaignId of seedCampaigns.map((c) => c.id)) {
		await db.campaign.update({
			where: { id: campaignId },
			data: { raisedCents: byCampaign.get(campaignId) ?? 0 }
		});
	}
	return seedCampaigns.length;
}

/**
 * Drop demo rows that no longer exist in seed-data.ts. Without this, deleting a
 * campaign from the data file would leave an orphan on every developer's DB.
 */
async function pruneRemovedDemoRows(): Promise<number> {
	const campaignIds = seedCampaigns.map((c) => c.id);

	// Dependants (members, images, donations, records, reviews, promise) cascade
	// off campaign, so deleting campaigns is enough for those tables.
	const campaigns = await db.campaign.deleteMany({
		where: { id: { startsWith: 'seed_', not: { in: campaignIds } } }
	});
	const results = await Promise.all([
		db.vetHospital.deleteMany({
			where: { id: { startsWith: 'seed_', not: { in: seedHospitals.map((h) => h.id) } } }
		}),
		db.fundingSource.deleteMany({
			where: { id: { startsWith: 'seed_', not: { in: seedFundingSources.map((f) => f.id) } } }
		}),
		db.pet.deleteMany({
			where: { id: { startsWith: 'seed_', not: { in: seedPets.map((p) => p.id) } } }
		}),
		db.campaignImage.deleteMany({
			where: { id: { startsWith: 'seed_', not: { in: seedImages.map((i) => i.id) } } }
		}),
		db.donation.deleteMany({
			where: { id: { startsWith: 'seed_', not: { in: seedDonations.map((d) => d.id) } } }
		}),
		db.vetRecord.deleteMany({
			where: { id: { startsWith: 'seed_', not: { in: seedVetRecords.map((r) => r.id) } } }
		}),
		db.campaignReview.deleteMany({
			where: { id: { startsWith: 'seed_', not: { in: seedReviews.map((r) => r.id) } } }
		}),
		db.promiseToPay.deleteMany({
			where: { campaignId: { startsWith: 'seed_', not: { in: campaignIds } } }
		})
	]);
	return campaigns.count + results.reduce((sum, r) => sum + r.count, 0);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

async function report(): Promise<void> {
	const seeded = { id: { startsWith: 'seed_' } };
	const [users, hospitals, funding, pets, campaigns, donations, promises, reviews] =
		await Promise.all([
			db.user.count({ where: { id: { in: seedUsers.map((u) => u.id) } } }),
			db.vetHospital.count({ where: seeded }),
			db.fundingSource.count({ where: seeded }),
			db.pet.count({ where: seeded }),
			db.campaign.count({ where: seeded }),
			db.donation.count({ where: seeded }),
			db.promiseToPay.count({ where: { accepted: true, campaignId: { startsWith: 'seed_' } } }),
			db.campaignReview.count({ where: seeded })
		]);
	const [emergency, lowCost, local] = await Promise.all([
		db.vetHospital.count({ where: { ...seeded, isEmergency: true } }),
		db.vetHospital.count({ where: { ...seeded, isLowCost: true } }),
		db.fundingSource.count({ where: { ...seeded, scope: { in: ['HAMPTON_ROADS', 'VIRGINIA'] } } })
	]);

	console.log(
		[
			'',
			'  demo data',
			`    users                ${users}  (4 logins + 1 system, 1 moderator)`,
			`    pets                 ${pets}`,
			`    campaigns            ${campaigns}`,
			`    donations            ${donations}`,
			`    promise-to-pay       ${promises} accepted`,
			`    moderation reviews   ${reviews}`,
			'',
			'  directories',
			`    hospitals            ${hospitals}  (${emergency} emergency, ${lowCost} low-cost, 1 open 24/7)`,
			`    funding sources      ${funding}  (${FUNDING_SOURCE_TARGETS.starter} starter + ${FUNDING_SOURCE_TARGETS.added} added, ${local} Virginia/HR)`,
			''
		].join('\n')
	);
}

async function main(): Promise<void> {
	console.log('Seeding TakeTheLead demo data\u2026');
	validateData();

	const steps: Array<[string, () => Promise<number>]> = [
		['users + accounts', applyUsers],
		['vet hospitals', seedHospitalsDirectory],
		['funding sources', seedFundingDirectory],
		['pets', seedPetsTable],
		['campaigns', seedCampaignsTable],
		['campaign links', seedCampaignLinks],
		['promise to pay', seedPromisesToPayTable],
		['donations', seedDonationsTable],
		['vet records', seedVetRecordsTable],
		['reviews', seedReviewsTable]
	];
	for (const [label, run] of steps) {
		console.log(`  ${String(await run()).padStart(4)}  ${label}`);
	}

	console.log(`  ${String(await recomputeRaisedCents()).padStart(4)}  raisedCents recomputed`);
	const pruned = await pruneRemovedDemoRows();
	if (pruned > 0) console.log(`  ${String(pruned).padStart(4)}  stale demo rows removed`);

	await report();
}

main()
	.catch((error) => {
		console.error('\nSeed failed:');
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
