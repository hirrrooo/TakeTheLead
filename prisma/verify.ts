/**
 * C8 + C9 verification probes (temporary script — safe to delete).
 * C8: raisedCents invariant — cache must equal sum of COMPLETED donations.
 * C9: constraint probes — unique slug, unique member pair, unique storyPet pair,
 *     unique providerRef, guest+anonymous donation allowed, Restrict on owner delete.
 */
import 'dotenv/config';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../generated/prisma/client.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

let failures = 0;
const ok = (name: string, pass: boolean, extra = '') => {
	console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
	if (!pass) failures++;
};

async function expectReject(name: string, fn: () => Promise<unknown>) {
	try {
		await fn();
		ok(name, false, 'expected rejection but write succeeded');
	} catch (e) {
		const msg = e instanceof Error ? e.constructor.name : String(e);
		ok(name, true, `rejected with ${msg}`);
	}
}

// ---- C8: raisedCents invariant on every story ----
const stories = await db.story.findMany({
	select: { id: true, slug: true, raisedCents: true, donations: { where: { status: 'COMPLETED' }, select: { amountCents: true } } }
});
for (const s of stories) {
	const sum = s.donations.reduce((a, d) => a + d.amountCents, 0);
	ok(`raisedCents invariant [${s.slug}]`, s.raisedCents === sum, `cache=${s.raisedCents} sum=${sum}`);
}

// ---- C9: unique constraints ----
await expectReject('duplicate slug rejected', () =>
	db.story.create({
		data: { slug: 'bella-needs-acl-surgery', title: 'x', body: 'x', ownerId: 'seed_maria' }
	})
);
await expectReject('duplicate story member pair rejected', () =>
	db.storyMember.create({ data: { storyId: 'seed_story_bella', userId: 'seed_maria' } })
);
await expectReject('duplicate storyPet pair rejected', () =>
	db.storyPet.create({ data: { storyId: 'seed_story_bella', petId: 'seed_pet_bella' } })
);
const firstRef = (await db.donation.findFirst({ where: { providerRef: { not: null } }, select: { providerRef: true } }))?.providerRef;
await expectReject('duplicate providerRef rejected', () =>
	db.donation.create({
		data: { storyId: 'seed_story_bella', amountCents: 100, providerRef: firstRef ?? 'dup-ref' }
	})
);

// guest + anonymous donation must SUCCEED (cleanup after)
try {
	const d = await db.donation.create({
		data: { storyId: 'seed_story_max', amountCents: 1234, donorUserId: null, donorName: null, isAnonymous: true }
	});
	ok('guest + anonymous donation allowed', true);
	await db.donation.delete({ where: { id: d.id } });
} catch {
	ok('guest + anonymous donation allowed', false, 'write was rejected');
}

// Restrict: deleting a user who still owns a story must fail
await expectReject('deleting a story owner is restricted', () => db.user.delete({ where: { id: 'seed_maria' } }));

console.log(failures === 0 ? '\nALL PROBES PASSED' : `\n${failures} PROBE(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
await db.$disconnect();
