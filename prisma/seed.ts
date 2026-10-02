/**
 * Demo/dev seed data for TakeTheLead.
 * - Idempotent: fixed `seed_*` ids + upsert everywhere; re-running changes nothing.
 * - FK-safe order: users -> accounts -> clinics -> pets -> stories -> storyPets
 *   -> members -> images -> donations -> vetRecords -> reviews.
 * - raisedCents is always RECOMPUTED from COMPLETED donations at the end,
 *   never hardcoded.
 * - All demo accounts share the password: password123!
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { hashPassword } from 'better-auth/crypto';
import { PrismaClient } from '../generated/prisma/client.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

const PASSWORD = 'password123!';

// Deterministic fake "provider refs" so re-runs don't collide on @unique
const ref = (name: string) => createHash('sha1').update(name).digest('hex').slice(0, 16);

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function seedUsers() {
	const users = [
		{ id: 'system', name: 'TakeTheLead System', email: 'system@takethelead.dev', isSystem: true, isModerator: false },
		{ id: 'seed_maria', name: 'Maria Alvarez', email: 'seed_maria@takethelead.dev', isSystem: false, isModerator: false },
		{ id: 'seed_james', name: 'James Alvarez', email: 'seed_james@takethelead.dev', isSystem: false, isModerator: false },
		{ id: 'seed_pat', name: 'Pat Nguyen', email: 'seed_pat@takethelead.dev', isSystem: false, isModerator: false },
		{ id: 'seed_mod', name: 'Dana Whitfield', email: 'seed_mod@takethelead.dev', isSystem: false, isModerator: true }
	];

	for (const u of users) {
		await db.user.upsert({
			where: { id: u.id },
			update: { name: u.name, email: u.email, isSystem: u.isSystem, isModerator: u.isModerator },
			create: { ...u, emailVerified: true }
		});
	}

	// Loginable credential accounts (Better Auth schema). Skip the system user.
	const hash = await hashPassword(PASSWORD);
	for (const u of users.filter((x) => x.id !== 'system')) {
		await db.account.upsert({
			where: { id: `seed_acc_${u.id}` },
			update: { password: hash },
			create: {
				id: `seed_acc_${u.id}`,
				accountId: u.id,
				providerId: 'credential',
				userId: u.id,
				password: hash,
				createdAt: new Date(),
				updatedAt: new Date()
			}
		});
	}
}

async function seedClinics() {
	const clinics = [
		{
			id: 'seed_clinic_northside',
			name: 'Northside Animal Hospital',
			addressLine: '4120 Northside Pkwy',
			city: 'Columbus',
			state: 'OH',
			postalCode: '43214',
			phone: '(614) 555-0142',
			email: 'care@northsideanimal.example',
			website: 'https://northsideanimal.example',
			isVerified: true,
			createdById: 'seed_mod'
		},
		{
			// near-duplicate on purpose — exercises a future clinic-merge flow
			id: 'seed_clinic_northside_dup',
			name: 'Northside Vet Clinic',
			addressLine: '4120 Northside Parkway',
			city: 'Columbus',
			state: 'OH',
			postalCode: '43214',
			isVerified: false,
			createdById: 'seed_pat'
		},
		{
			id: 'seed_clinic_happypaws',
			name: 'Happy Paws Emergency Vet',
			addressLine: '88 Meridian Ave',
			city: 'Columbus',
			state: 'OH',
			postalCode: '43215',
			phone: '(614) 555-0199',
			isVerified: true,
			createdById: 'seed_maria'
		}
	];

	for (const c of clinics) {
		await db.vetClinic.upsert({ where: { id: c.id }, update: c, create: c });
	}
}

async function seedPets() {
	const pets = [
		{
			id: 'seed_pet_bella',
			name: 'Bella',
			species: 'Dog',
			breed: 'Golden Retriever',
			dateOfBirth: new Date('2019-04-12'),
			sex: 'F',
			photoUrl: 'https://picsum.photos/seed/bella/400/400',
			bio: 'Loves tennis balls and belly rubs.',
			ownerId: 'seed_maria'
		},
		{
			id: 'seed_pet_max',
			name: 'Max',
			species: 'Cat',
			breed: 'Domestic Shorthair',
			dateOfBirth: new Date('2017-09-01'),
			sex: 'M',
			photoUrl: 'https://picsum.photos/seed/maxcat/400/400',
			bio: 'A dignified gentleman who demands breakfast at 5am.',
			ownerId: 'seed_maria'
		},
		{
			id: 'seed_pet_whiskers',
			name: 'Whiskers',
			species: 'Cat',
			breed: 'Tabby',
			sex: 'M',
			photoUrl: 'https://picsum.photos/seed/whiskers/400/400',
			bio: 'Indoor cat, outdoor opinions.',
			ownerId: 'seed_maria'
		},
		{
			id: 'seed_pet_ruby',
			name: 'Ruby',
			species: 'Dog',
			breed: 'Puppy (mixed)',
			dateOfBirth: new Date('2025-11-20'),
			sex: 'F',
			photoUrl: 'https://picsum.photos/seed/rubydog/400/400',
			bio: 'Tiny, loud, and worth every cent.',
			ownerId: 'seed_pat'
		},
		{
			id: 'seed_pet_duke',
			name: 'Duke',
			species: 'Dog',
			breed: 'Labrador',
			dateOfBirth: new Date('2025-10-02'),
			sex: 'M',
			photoUrl: 'https://picsum.photos/seed/dukedog/400/400',
			bio: 'Ruby\u2019s big brother in every way that matters.',
			ownerId: 'seed_pat'
		}
	];

	for (const p of pets) {
		await db.pet.upsert({ where: { id: p.id }, update: p, create: p });
	}
}

async function seedStories() {
	const stories = [
		{
			id: 'seed_story_bella',
			slug: 'bella-needs-acl-surgery',
			title: 'Bella Needs ACL Surgery',
			summary: 'Our 6-year-old Golden tore her ACL. Surgery is her only path back to running.',
			body: 'Bella has always been the dog who chases everything \u2014 tennis balls, squirrels, leaves. Two weeks ago she yelped mid-chase and stopped bearing weight on her back left leg. The orthopedic specialist confirmed a complete cranial cruciate ligament tear and recommended a TPLO surgery. The quote is far beyond what we can pay at once, so we are asking for help. Every dollar goes straight to the surgical invoice, and we will post the vet records here as they arrive.',
			coverImageUrl: 'https://picsum.photos/seed/bellacover/1200/800',
			status: 'APPROVED',
			visibility: 'PUBLIC',
			goalAmountCents: 350000,
			deadline: daysAgo(-45), // 45 days in the future
			allowGuestDonations: true,
			isOwnerAnonymous: false,
			ownerDisplayName: null,
			vetClinicId: 'seed_clinic_northside',
			ownerId: 'seed_maria',
			publishedAt: daysAgo(20),
			closedAt: null,
			createdAt: daysAgo(22)
		},
		{
			id: 'seed_story_max',
			slug: 'max-needs-insulin',
			title: 'Help Max Get His Insulin',
			summary: 'Max was just diagnosed with diabetes. Monthly insulin costs add up fast.',
			body: 'After a month of excessive water-drinking, Max came home with a diabetes diagnosis. He needs twice-daily insulin injections and monthly supplies. There is no single big surgery bill here \u2014 just a steady monthly cost we want to keep up with without skipping doses. No goal, no deadline: help when you can.',
			coverImageUrl: 'https://picsum.photos/seed/maxcover/1200/800',
			status: 'APPROVED',
			visibility: 'PUBLIC',
			goalAmountCents: null, // exercises optional goal
			deadline: null, // exercises optional deadline
			allowGuestDonations: true,
			isOwnerAnonymous: false,
			ownerDisplayName: null,
			vetClinicId: null, // exercises optional clinic
			ownerId: 'seed_maria',
			publishedAt: daysAgo(15),
			closedAt: null,
			createdAt: daysAgo(16)
		},
		{
			id: 'seed_story_whiskers',
			slug: 'whiskers-urinary-emergency',
			title: 'Whiskers\u2019 Midnight Emergency Surgery',
			summary: 'A blocked cat, a midnight ER visit, and a bill we did not see coming.',
			body: 'Whiskers came in to the emergency clinic at 1am unable to pass urine \u2014 a blocked cat is a same-night emergency, and the catheter, hospitalization, and follow-up surgery added up before we even got home. We are keeping our names off this story; his family is handling the updates.',
			coverImageUrl: 'https://picsum.photos/seed/whiskerscover/1200/800',
			status: 'APPROVED',
			visibility: 'PUBLIC',
			goalAmountCents: 220000,
			deadline: daysAgo(-30),
			allowGuestDonations: true,
			isOwnerAnonymous: true, // exercises anonymous owner presentation
			ownerDisplayName: 'Whiskers\u2019 Family',
			vetClinicId: 'seed_clinic_happypaws',
			ownerId: 'seed_maria',
			publishedAt: daysAgo(10),
			closedAt: null,
			createdAt: daysAgo(11)
		},
		{
			id: 'seed_story_ruby_duke',
			slug: 'ruby-and-duke-parvo',
			title: 'Ruby & Duke vs. Parvo',
			summary: 'Two puppies, one virus, two hospital stays. Our sister is co-managing this fund.',
			body: 'We adopted Ruby and Duke from a shelter two weeks apart, and within days of each other both stopped eating. Parvo, both of them. They are in and out of IV fluids, and the household budget is not recovering any faster. Maria is helping us run this page while we are at the clinic.',
			coverImageUrl: 'https://picsum.photos/seed/puppiescover/1200/800',
			status: 'APPROVED',
			visibility: 'PUBLIC',
			goalAmountCents: 280000,
			deadline: daysAgo(-60),
			allowGuestDonations: true,
			isOwnerAnonymous: false,
			ownerDisplayName: null,
			vetClinicId: 'seed_clinic_northside_dup',
			ownerId: 'seed_pat',
			publishedAt: daysAgo(12),
			closedAt: null,
			createdAt: daysAgo(14)
		},
		{
			id: 'seed_story_ghost',
			slug: 'ghost-needs-hip-dysplasia-care',
			title: 'Ghost Needs Hip Dysplasia Care',
			summary: 'A rescue shepherd named Ghost needs staged hip treatment.',
			body: 'Ghost is a two-year-old German Shepherd rescue with hip dysplasia in both hips. His orthopedic plan is staged: pain management now, possible FHO surgery this fall. This page is awaiting moderation \u2014 which is exactly what a PENDING_REVIEW story looks like.',
			coverImageUrl: 'https://picsum.photos/seed/ghostdog/1200/800',
			status: 'PENDING_REVIEW', // exercises the moderation queue
			visibility: 'PUBLIC',
			goalAmountCents: 400000,
			deadline: null,
			allowGuestDonations: true,
			isOwnerAnonymous: false,
			ownerDisplayName: null,
			vetClinicId: 'seed_clinic_happypaws',
			ownerId: 'seed_pat',
			publishedAt: null,
			closedAt: null,
			createdAt: daysAgo(2)
		},
		{
			id: 'seed_story_senior_cat',
			slug: 'senior-cat-hospice-fund',
			title: 'Senior Cat Hospice Fund (Closed)',
			summary: 'Our deadline passed and this fund is now closed. Kept to show terminal states.',
			body: 'Miso was 19. We raised what we needed before the deadline, cared for her through hospice, and closed this fund. She passed peacefully in August. This story stays up as a record, and as a demonstration of the CLOSED state with a past deadline.',
			coverImageUrl: 'https://picsum.photos/seed/seniorcat/1200/800',
			status: 'CLOSED',
			visibility: 'PUBLIC',
			goalAmountCents: 120000,
			deadline: daysAgo(60), // past deadline
			allowGuestDonations: false, // closed funds stop accepting guests
			isOwnerAnonymous: false,
			ownerDisplayName: null,
			vetClinicId: 'seed_clinic_northside',
			ownerId: 'seed_pat',
			publishedAt: daysAgo(120),
			closedAt: daysAgo(58),
			createdAt: daysAgo(121)
		}
	];

	for (const s of stories) {
		await db.story.upsert({ where: { id: s.id }, update: s, create: s });
	}
}

async function seedStoryPets() {
	const links = [
		{ storyId: 'seed_story_bella', petId: 'seed_pet_bella', role: 'PRIMARY' },
		{ storyId: 'seed_story_max', petId: 'seed_pet_max', role: 'PRIMARY' },
		{ storyId: 'seed_story_whiskers', petId: 'seed_pet_whiskers', role: 'PRIMARY' },
		{ storyId: 'seed_story_ruby_duke', petId: 'seed_pet_ruby', role: 'PRIMARY' },
		{ storyId: 'seed_story_ruby_duke', petId: 'seed_pet_duke', role: 'SECONDARY' }, // multi-pet story
		{ storyId: 'seed_story_senior_cat', petId: 'seed_pet_max', role: 'SECONDARY' } // Max appears in a past story too
	];

	for (const l of links) {
		await db.storyPet.upsert({
			where: { storyId_petId: { storyId: l.storyId, petId: l.petId } },
			update: { role: l.role },
			create: l
		});
	}
}

async function seedMembers() {
	const members = [
		// Bella story: Maria owns, brother James co-manages (the family case)
		{ storyId: 'seed_story_bella', userId: 'seed_maria', role: 'OWNER', status: 'ACCEPTED', invitedById: null },
		{ storyId: 'seed_story_bella', userId: 'seed_james', role: 'MANAGER', status: 'ACCEPTED', invitedById: 'seed_maria' },
		{ storyId: 'seed_story_max', userId: 'seed_maria', role: 'OWNER', status: 'ACCEPTED', invitedById: null },
		{ storyId: 'seed_story_whiskers', userId: 'seed_maria', role: 'OWNER', status: 'ACCEPTED', invitedById: null },
		// Ruby & Duke: Pat owns, Maria invited as co-manager
		{ storyId: 'seed_story_ruby_duke', userId: 'seed_pat', role: 'OWNER', status: 'ACCEPTED', invitedById: null },
		{ storyId: 'seed_story_ruby_duke', userId: 'seed_maria', role: 'MANAGER', status: 'ACCEPTED', invitedById: 'seed_pat' },
		{ storyId: 'seed_story_ghost', userId: 'seed_pat', role: 'OWNER', status: 'ACCEPTED', invitedById: null },
		{ storyId: 'seed_story_senior_cat', userId: 'seed_pat', role: 'OWNER', status: 'ACCEPTED', invitedById: null },
		// A still-pending invite + a viewer, to exercise the state matrix
		{ storyId: 'seed_story_bella', userId: 'seed_pat', role: 'VIEWER', status: 'PENDING', invitedById: 'seed_maria' },
		{ storyId: 'seed_story_ghost', userId: 'seed_james', role: 'VIEWER', status: 'PENDING', invitedById: 'seed_pat' }
	];

	for (const m of members) {
		await db.storyMember.upsert({
			where: { storyId_userId: { storyId: m.storyId, userId: m.userId } },
			update: { role: m.role, status: m.status, invitedById: m.invitedById },
			create: m
		});
	}
}

async function seedImages() {
	const images = [
		{ id: 'seed_img_bella_1', storyId: 'seed_story_bella', url: 'https://picsum.photos/seed/bella1/1200/800', alt: 'Bella at the orthopedic specialist', sortOrder: 0, widthPx: 1200, heightPx: 800 },
		{ id: 'seed_img_bella_2', storyId: 'seed_story_bella', url: 'https://picsum.photos/seed/bella2/1200/800', alt: 'Bella mid-chase, before the injury', sortOrder: 1, widthPx: 1200, heightPx: 800 },
		{ id: 'seed_img_max_1', storyId: 'seed_story_max', url: 'https://picsum.photos/seed/max1/1200/800', alt: 'Max at his diagnosis appointment', sortOrder: 0, widthPx: 1200, heightPx: 800 },
		{ id: 'seed_img_whiskers_1', storyId: 'seed_story_whiskers', url: 'https://picsum.photos/seed/whiskers1/1200/800', alt: 'Whiskers recovering with his cone', sortOrder: 0, widthPx: 1200, heightPx: 800 },
		{ id: 'seed_img_puppies_1', storyId: 'seed_story_ruby_duke', url: 'https://picsum.photos/seed/ruby1/1200/800', alt: 'Ruby on IV fluids', sortOrder: 0, widthPx: 1200, heightPx: 800 },
		{ id: 'seed_img_puppies_2', storyId: 'seed_story_ruby_duke', url: 'https://picsum.photos/seed/duke1/1200/800', alt: 'Duke\u2019s first meal after treatment', sortOrder: 1, widthPx: 1200, heightPx: 800 },
		{ id: 'seed_img_ghost_1', storyId: 'seed_story_ghost', url: 'https://picsum.photos/seed/ghost1/1200/800', alt: 'Ghost on a long walk', sortOrder: 0, widthPx: 1200, heightPx: 800 },
		{ id: 'seed_img_miso_1', storyId: 'seed_story_senior_cat', url: 'https://picsum.photos/seed/miso1/1200/800', alt: 'Miso in her sunny hospice spot', sortOrder: 0, widthPx: 1200, heightPx: 800 }
	];

	for (const img of images) {
		await db.storyImage.upsert({ where: { id: img.id }, update: img, create: img });
	}
}

async function seedDonations() {
	// ~25 donations across the state matrix: registered/guest donors, anonymous
	// display, PENDING/COMPLETED/REFUNDED statuses, MANUAL/CASH/CHECK providers.
	const donations = [
		// Bella (happy path, ~$1,900 completed of $3,500 goal)
		{ id: 'seed_don_b01', storyId: 'seed_story_bella', donorUserId: 'seed_james', donorName: null, isAnonymous: false, amountCents: 20000, status: 'COMPLETED', provider: 'MANUAL', message: 'For our girl \u2014 love you both.' },
		{ id: 'seed_don_b02', storyId: 'seed_story_bella', donorUserId: null, donorName: 'Grace L.', isAnonymous: false, amountCents: 5000, status: 'COMPLETED', provider: 'MANUAL', message: 'From one Golden owner to another.' },
		{ id: 'seed_don_b03', storyId: 'seed_story_bella', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 10000, status: 'COMPLETED', provider: 'MANUAL', message: null },
		{ id: 'seed_don_b04', storyId: 'seed_story_bella', donorUserId: 'seed_pat', donorName: null, isAnonymous: false, amountCents: 3000, status: 'COMPLETED', provider: 'MANUAL', message: 'Not much, but she is a good girl.' },
		{ id: 'seed_don_b05', storyId: 'seed_story_bella', donorUserId: null, donorName: 'The Okafor Family', isAnonymous: false, amountCents: 25000, status: 'COMPLETED', provider: 'CHECK', message: 'Go Bella!' },
		{ id: 'seed_don_b06', storyId: 'seed_story_bella', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 15000, status: 'COMPLETED', provider: 'MANUAL', message: 'Wishing her a fast recovery.' },
		{ id: 'seed_don_b07', storyId: 'seed_story_bella', donorUserId: 'seed_mod', donorName: null, isAnonymous: false, amountCents: 7500, status: 'COMPLETED', provider: 'MANUAL', message: 'Moderator hat off, donor hat on.' },
		{ id: 'seed_don_b08', storyId: 'seed_story_bella', donorUserId: null, donorName: 'Sam R.', isAnonymous: false, amountCents: 4000, status: 'PENDING', provider: 'MANUAL', message: 'Check is in the mail.' },
		{ id: 'seed_don_b09', storyId: 'seed_story_bella', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 50000, status: 'REFUNDED', provider: 'MANUAL', message: null },
		// Max (no goal, small recurring amounts)
		{ id: 'seed_don_m01', storyId: 'seed_story_max', donorUserId: 'seed_pat', donorName: null, isAnonymous: false, amountCents: 2500, status: 'COMPLETED', provider: 'MANUAL', message: 'Monthly Max fund contribution.' },
		{ id: 'seed_don_m02', storyId: 'seed_story_max', donorUserId: null, donorName: 'Priya S.', isAnonymous: false, amountCents: 1500, status: 'COMPLETED', provider: 'MANUAL', message: 'Diabetic cat dad here. Hang in there.' },
		{ id: 'seed_don_m03', storyId: 'seed_story_max', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 2000, status: 'COMPLETED', provider: 'MANUAL', message: null },
		{ id: 'seed_don_m04', storyId: 'seed_story_max', donorUserId: null, donorName: 'Lena K.', isAnonymous: false, amountCents: 1000, status: 'FAILED', provider: 'MANUAL', message: 'Card declined, will retry.' },
		{ id: 'seed_don_m05', storyId: 'seed_story_max', donorUserId: 'seed_james', donorName: null, isAnonymous: false, amountCents: 3000, status: 'COMPLETED', provider: 'CASH', message: 'Cash from the office kitty.' },
		// Whiskers (anonymous-owner story)
		{ id: 'seed_don_w01', storyId: 'seed_story_whiskers', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 30000, status: 'COMPLETED', provider: 'MANUAL', message: 'Blocked cats scare every cat owner. Glad he is okay.' },
		{ id: 'seed_don_w02', storyId: 'seed_story_whiskers', donorUserId: 'seed_pat', donorName: null, isAnonymous: false, amountCents: 5000, status: 'COMPLETED', provider: 'MANUAL', message: null },
		{ id: 'seed_don_w03', storyId: 'seed_story_whiskers', donorUserId: null, donorName: 'ER Doc Mike', isAnonymous: false, amountCents: 10000, status: 'COMPLETED', provider: 'MANUAL', message: 'I saw this one coming. Take care of him.' },
		{ id: 'seed_don_w04', storyId: 'seed_story_whiskers', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 8000, status: 'PENDING', provider: 'MANUAL', message: null },
		// Ruby & Duke (multi-pet)
		{ id: 'seed_don_r01', storyId: 'seed_story_ruby_duke', donorUserId: 'seed_maria', donorName: null, isAnonymous: false, amountCents: 15000, status: 'COMPLETED', provider: 'MANUAL', message: 'For my two favorite puppies.' },
		{ id: 'seed_don_r02', storyId: 'seed_story_ruby_duke', donorUserId: null, donorName: 'Shelter Friends', isAnonymous: false, amountCents: 40000, status: 'COMPLETED', provider: 'CHECK', message: 'From the whole adoption team.' },
		{ id: 'seed_don_r03', storyId: 'seed_story_ruby_duke', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 7000, status: 'COMPLETED', provider: 'MANUAL', message: 'Parvo sucks. Puppies win.' },
		{ id: 'seed_don_r04', storyId: 'seed_story_ruby_duke', donorUserId: null, donorName: 'Chris & Ana', isAnonymous: false, amountCents: 12000, status: 'COMPLETED', provider: 'MANUAL', message: 'So glad Duke kept his appetite.' },
		{ id: 'seed_don_r05', storyId: 'seed_story_ruby_duke', donorUserId: 'seed_james', donorName: null, isAnonymous: false, amountCents: 2000, status: 'CANCELLED', provider: 'MANUAL', message: 'Double-clicked by accident.' },
		// Ghost (pending story: donations exist but story is not approved yet)
		{ id: 'seed_don_g01', storyId: 'seed_story_ghost', donorUserId: 'seed_james', donorName: null, isAnonymous: false, amountCents: 5000, status: 'PENDING', provider: 'MANUAL', message: 'Waiting on approval, sending early.' },
		// Senior cat (closed story, historical completed + one refunded)
		{ id: 'seed_don_s01', storyId: 'seed_story_senior_cat', donorUserId: null, donorName: 'Neighborhood Book Club', isAnonymous: false, amountCents: 35000, status: 'COMPLETED', provider: 'CHECK', message: 'In honor of Miso.' },
		{ id: 'seed_don_s02', storyId: 'seed_story_senior_cat', donorUserId: 'seed_maria', donorName: null, isAnonymous: false, amountCents: 10000, status: 'COMPLETED', provider: 'MANUAL', message: 'She deserved every bit of sunshine.' },
		{ id: 'seed_don_s03', storyId: 'seed_story_senior_cat', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 15000, status: 'REFUNDED', provider: 'MANUAL', message: null }
	];

	for (const d of donations) {
		const data = {
			...d,
			currency: 'usd',
			feeCents: 0,
			providerRef: `seed_${ref(d.id)}`,
			receiptNumber: d.status === 'COMPLETED' ? `R-${d.id.replace('seed_don_', 'S')}` : null,
			completedAt: d.status === 'COMPLETED' || d.status === 'REFUNDED' ? daysAgo(5) : null,
			refundedAt: d.status === 'REFUNDED' ? daysAgo(2) : null,
			createdAt: daysAgo(9)
		};
		await db.donation.upsert({ where: { id: d.id }, update: data, create: data });
	}

	// Recompute the raisedCents cache from COMPLETED donations — never hardcoded.
	const stories = await db.story.findMany({ select: { id: true } });
	for (const s of stories) {
		const agg = await db.donation.aggregate({
			where: { storyId: s.id, status: 'COMPLETED' },
			_sum: { amountCents: true }
		});
		await db.story.update({ where: { id: s.id }, data: { raisedCents: agg._sum.amountCents ?? 0 } });
	}
}

async function seedVetRecords() {
	const records = [
		{
			id: 'seed_vr_bella_invoice',
			storyId: 'seed_story_bella',
			clinicId: 'seed_clinic_northside',
			clinicName: null,
			kind: 'INVOICE',
			title: 'TPLO surgery invoice',
			amountCents: 348000,
			invoiceNumber: 'NAH-2026-0412',
			documentUrl: 'https://storage.example/private/bella-invoice.pdf',
			isVerified: true,
			verifiedById: 'seed_mod',
			uploadedById: 'seed_maria',
			createdAt: daysAgo(21)
		},
		{
			id: 'seed_vr_bella_estimate',
			storyId: 'seed_story_bella',
			clinicId: 'seed_clinic_northside',
			clinicName: null,
			kind: 'ESTIMATE',
			title: 'Pre-op orthopedic consult estimate',
			amountCents: 32000,
			invoiceNumber: null,
			documentUrl: null,
			isVerified: false,
			verifiedById: null,
			uploadedById: 'seed_maria',
			createdAt: daysAgo(25)
		},
		{
			// free-text clinic fallback: clinic not in the directory
			id: 'seed_vr_max_invoice',
			storyId: 'seed_story_max',
			clinicId: null,
			clinicName: 'Delaware Ave Cat Clinic',
			kind: 'RECEIPT',
			title: 'First month of insulin supplies',
			amountCents: 18500,
			invoiceNumber: 'DACC-8841',
			documentUrl: null,
			isVerified: false,
			verifiedById: null,
			uploadedById: 'seed_maria',
			createdAt: daysAgo(14)
		},
		{
			id: 'seed_vr_whiskers_invoice',
			storyId: 'seed_story_whiskers',
			clinicId: 'seed_clinic_happypaws',
			clinicName: null,
			kind: 'INVOICE',
			title: 'Emergency catheterization + 2-night stay',
			amountCents: 214000,
			invoiceNumber: 'HP-26-1177',
			documentUrl: 'https://storage.example/private/whiskers-invoice.pdf',
			isVerified: true,
			verifiedById: 'seed_mod',
			uploadedById: 'seed_maria',
			createdAt: daysAgo(9)
		},
		{
			id: 'seed_vr_puppies_invoice',
			storyId: 'seed_story_ruby_duke',
			clinicId: 'seed_clinic_northside_dup',
			clinicName: null,
			kind: 'INVOICE',
			title: 'Parvo treatment \u2014 both puppies, week 1',
			amountCents: 265000,
			invoiceNumber: 'NVC-3310',
			documentUrl: null,
			isVerified: false,
			verifiedById: null,
			uploadedById: 'seed_pat',
			createdAt: daysAgo(11)
		}
	];

	for (const r of records) {
		await db.vetRecord.upsert({ where: { id: r.id }, update: r, create: r });
	}
}

async function seedReviews() {
	// Bella: CHANGES_REQUESTED then APPROVED — shows the review audit trail.
	const reviews = [
		{
			id: 'seed_review_bella_1',
			storyId: 'seed_story_bella',
			reviewerId: 'seed_mod',
			decision: 'CHANGES_REQUESTED',
			reason: 'Please attach the signed surgical estimate before we can approve.',
			createdAt: daysAgo(21)
		},
		{
			id: 'seed_review_bella_2',
			storyId: 'seed_story_bella',
			reviewerId: 'seed_mod',
			decision: 'APPROVED',
			reason: 'Invoice verified against Northside Animal Hospital. Approved.',
			createdAt: daysAgo(20)
		},
		{
			id: 'seed_review_max_1',
			storyId: 'seed_story_max',
			reviewerId: 'seed_mod',
			decision: 'APPROVED',
			reason: 'Receipt looks legitimate. Approved.',
			createdAt: daysAgo(15)
		},
		{
			id: 'seed_review_whiskers_1',
			storyId: 'seed_story_whiskers',
			reviewerId: 'seed_mod',
			decision: 'APPROVED',
			reason: 'Anonymous owner request honored; invoice verified.',
			createdAt: daysAgo(10)
		},
		{
			id: 'seed_review_puppies_1',
			storyId: 'seed_story_ruby_duke',
			reviewerId: 'seed_mod',
			decision: 'APPROVED',
			reason: 'Approved. Note: duplicate clinic entry flagged for a future merge.',
			createdAt: daysAgo(12)
		},
		{
			id: 'seed_review_senior_1',
			storyId: 'seed_story_senior_cat',
			reviewerId: 'seed_mod',
			decision: 'APPROVED',
			reason: 'Approved at publish time.',
			createdAt: daysAgo(120)
		}
	];

	for (const r of reviews) {
		await db.storyReview.upsert({ where: { id: r.id }, update: r, create: r });
	}

	// Self-heal: remove any review rows not part of the demo dataset
	// (e.g. left behind by verification scripts on the Ghost story).
	await db.storyReview.deleteMany({ where: { id: { notIn: reviews.map((r) => r.id) } } });
}

async function main() {
	console.log('Seeding TakeTheLead demo data...');
	await seedUsers();
	await seedClinics();
	await seedPets();
	await seedStories();
	await seedStoryPets();
	await seedMembers();
	await seedImages();
	await seedDonations();
	await seedVetRecords();
	await seedReviews();

	const counts = {
		users: await db.user.count(),
		pets: await db.pet.count(),
		stories: await db.story.count(),
		donations: await db.donation.count(),
		clinics: await db.vetClinic.count(),
		vetRecords: await db.vetRecord.count(),
		reviews: await db.storyReview.count()
	};
	console.log('Seed complete:', counts);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
