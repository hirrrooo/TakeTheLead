/**
 * C11a: exercises the guarded mutations from src/lib/server/db/queries.
 * Runs against local.db, then restores demo state by re-running the seed.
 */
import 'dotenv/config';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../generated/prisma/client.ts';
import {
	AccessDeniedError,
	ValidationError,
	computeRaisedCents,
	moderateStory,
	recordDonation,
	requireStoryAccess,
	setDonationStatus,
	setStoryOwner
} from '../src/lib/server/db/queries/index.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
export const db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

let failures = 0;
const ok = (name: string, pass: boolean, extra = '') => {
	console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
	if (!pass) failures++;
};

const createdDonationIds: string[] = [];

// ---- requireStoryAccess ----
ok('requireStoryAccess: OWNER accepted', (await requireStoryAccess('seed_story_bella', 'seed_maria')).role === 'OWNER');
ok('requireStoryAccess: MANAGER accepted', (await requireStoryAccess('seed_story_bella', 'seed_james')).role === 'MANAGER');
try {
	await requireStoryAccess('seed_story_bella', 'seed_pat'); // PENDING VIEWER
	ok('requireStoryAccess: pending viewer denied', false);
} catch (e) {
	ok('requireStoryAccess: pending viewer denied', e instanceof AccessDeniedError);
}
try {
	await requireStoryAccess('seed_story_bella', 'seed_mod'); // non-member
	ok('requireStoryAccess: non-member denied', false);
} catch (e) {
	ok('requireStoryAccess: non-member denied', e instanceof AccessDeniedError);
}

// ---- recordDonation keeps raisedCents in sync ----
const before = await db.story.findUniqueOrThrow({ where: { id: 'seed_story_bella' }, select: { raisedCents: true } });
const don = await recordDonation({
	storyId: 'seed_story_bella',
	amountCents: 11100,
	status: 'COMPLETED',
	donorName: 'Guard Probe',
	providerRef: `probe_${Date.now()}`
});
createdDonationIds.push(don.id);
const after = await db.story.findUniqueOrThrow({ where: { id: 'seed_story_bella' }, select: { raisedCents: true } });
ok('recordDonation updates raisedCents atomically', after.raisedCents === before.raisedCents + 11100, `${before.raisedCents} -> ${after.raisedCents}`);

// PENDING donation must NOT change the cache
const don2 = await recordDonation({ storyId: 'seed_story_bella', amountCents: 99900, status: 'PENDING', providerRef: `probe_p_${Date.now()}` });
createdDonationIds.push(don2.id);
const afterPending = await db.story.findUniqueOrThrow({ where: { id: 'seed_story_bella' }, select: { raisedCents: true } });
ok('PENDING donation leaves cache alone', afterPending.raisedCents === after.raisedCents);

// transition PENDING -> COMPLETED -> REFUNDED
await setDonationStatus(don2.id, 'COMPLETED');
const afterComplete = await computeRaisedCents(db, 'seed_story_bella');
const cacheComplete = (await db.story.findUniqueOrThrow({ where: { id: 'seed_story_bella' }, select: { raisedCents: true } })).raisedCents;
ok('setDonationStatus COMPLETED syncs cache', cacheComplete === afterComplete, `cache=${cacheComplete} agg=${afterComplete}`);
await setDonationStatus(don2.id, 'REFUNDED');
const cacheRefunded = (await db.story.findUniqueOrThrow({ where: { id: 'seed_story_bella' }, select: { raisedCents: true } })).raisedCents;
ok('setDonationStatus REFUNDED syncs cache', cacheRefunded === afterComplete - 99900);

// validation + guest guard
try {
	await recordDonation({ storyId: 'seed_story_bella', amountCents: 0 });
	ok('recordDonation rejects non-positive amount', false);
} catch (e) {
	ok('recordDonation rejects non-positive amount', e instanceof ValidationError);
}
try {
	await recordDonation({ storyId: 'seed_story_senior_cat', amountCents: 500, donorUserId: null });
	ok('guest donation blocked when allowGuestDonations=false', false);
} catch (e) {
	ok('guest donation blocked when allowGuestDonations=false', e instanceof AccessDeniedError);
}

// ---- moderateStory on the PENDING_REVIEW story ----
const mod = await moderateStory('seed_story_ghost', 'seed_mod', 'APPROVED', 'Probe approval');
ok('moderateStory APPROVED sets story status', mod.story.status === 'APPROVED');
ok('moderateStory APPROVED stamps publishedAt', mod.story.publishedAt !== null);
ok('moderateStory writes review row with reason', mod.review.reason === 'Probe approval');
const mod2 = await moderateStory('seed_story_ghost', 'seed_mod', 'CHANGES_REQUESTED', 'Probe rollback');
ok('moderateStory CHANGES_REQUESTED returns story to DRAFT', mod2.story.status === 'DRAFT');
const reviewCount = await db.storyReview.count({ where: { storyId: 'seed_story_ghost' } });
ok('moderateStory appends audit rows (immutable)', reviewCount === 2, `rows=${reviewCount}`);

// ---- setStoryOwner dual-write ----
const transferred = await setStoryOwner('seed_story_ghost', 'seed_james');
ok('setStoryOwner updates Story.ownerId', transferred.ownerId === 'seed_james');
const newOwnerRow = await db.storyMember.findUnique({ where: { storyId_userId: { storyId: 'seed_story_ghost', userId: 'seed_james' } } });
const oldOwnerRow = await db.storyMember.findUnique({ where: { storyId_userId: { storyId: 'seed_story_ghost', userId: 'seed_pat' } } });
ok('setStoryOwner promotes new owner member row', newOwnerRow?.role === 'OWNER' && newOwnerRow.status === 'ACCEPTED');
ok('setStoryOwner demotes previous owner to MANAGER', oldOwnerRow?.role === 'MANAGER' && oldOwnerRow.status === 'ACCEPTED');
ok('requireStoryAccess follows new owner', (await requireStoryAccess('seed_story_ghost', 'seed_james')).role === 'OWNER');

// cleanup probe donations, then restore demo state via seed
for (const id of createdDonationIds) await db.donation.delete({ where: { id } });
console.log('\nProbe donations cleaned. Re-run `npm run db:seed` to restore demo state.');
console.log(failures === 0 ? 'ALL GUARD PROBES PASSED' : `${failures} GUARD PROBE(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
await db.$disconnect();
