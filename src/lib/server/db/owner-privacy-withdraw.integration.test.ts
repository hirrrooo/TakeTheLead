/**
 * Integration test (TTL-310): owner privacy projection, search privacy,
 * pause/resume, and withdrawal behavior against the real database.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '$lib/server/db';
import { listBrowseCampaigns, listRecentPublicDonations } from '$lib/server/db/browse';
import {
	CAMPAIGN_DURATION_MS,
	findActiveCampaignForOwner,
	findCampaign,
	getPlatformTotals,
	listPublicCampaigns,
	listRecentPublicDonors
} from '$lib/server/db/campaigns';
import { recordDonation, setOwnerCampaignState, ValidationError } from '$lib/server/db/queries';

const run = randomUUID().slice(0, 8);
const ownerId = `it_priv_owner_${run}`;
const otherUserId = `it_priv_other_${run}`;
const hospitalId = `it_priv_hosp_${run}`;

const slugHospitalFallback = `it-priv-hosp-${run}`;
const slugExplicitCity = `it-priv-city-${run}`;
const slugAnonymous = `it-priv-anon-${run}`;
const slugExpired = `it-priv-exp-${run}`;
const slugPending = `it-priv-pend-${run}`;

const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
const deadline = new Date(start.getTime() + CAMPAIGN_DURATION_MS);

let campHospitalId = '';
let campExplicitCityId = '';
let campAnonId = '';
let campExpiredId = '';
let campPendingId = '';

beforeAll(async () => {
	await db.user.createMany({
		data: [
			{
				id: ownerId,
				email: `${ownerId}@test.dev`,
				name: 'Elena Vance-Test'
			},
			{
				id: otherUserId,
				email: `${otherUserId}@test.dev`,
				name: 'Jordan Bystander'
			}
		]
	});

	await db.vetHospital.create({
		data: {
			id: hospitalId,
			name: `Harbor Animal ER ${run}`,
			addressLine: `6095 Secret Street ${run}, Suite 200`,
			city: 'Virginia Beach',
			state: 'VA',
			postalCode: '23464'
		}
	});

	const c1 = await db.campaign.create({
		data: {
			slug: slugHospitalFallback,
			title: `Mochi Surgery ${run}`,
			summary: 'Mochi needs orthopedic surgery right away.',
			body: 'Mochi needs orthopedic surgery right away.',
			goalAmountCents: 200_000,
			status: 'APPROVED',
			visibility: 'PUBLIC',
			ownerId,
			vetHospitalId: hospitalId,
			publishedAt: start,
			deadline,
			promiseToPay: {
				create: {
					billAmountCents: 200_000,
					ttlCoversCents: 200_000,
					ownerMaxObligationCents: 0,
					ttlCoversText: 'Full coverage',
					ownerObligationText: 'Zero owner obligation',
					accepted: true,
					acceptedAt: start,
					acceptedBy: ownerId
				}
			}
		}
	});
	campHospitalId = c1.id;

	const c2 = await db.campaign.create({
		data: {
			slug: slugExplicitCity,
			title: `Biscuit Care ${run}`,
			summary: 'Biscuit needs emergency treatment.',
			body: 'Biscuit needs emergency treatment.',
			goalAmountCents: 150_000,
			status: 'APPROVED',
			visibility: 'PUBLIC',
			ownerId,
			ownerCity: `Norfolk-${run}`,
			vetHospitalId: hospitalId,
			publishedAt: start,
			deadline
		}
	});
	campExplicitCityId = c2.id;

	const c3 = await db.campaign.create({
		data: {
			slug: slugAnonymous,
			title: `Shadow ER ${run}`,
			summary: 'Shadow had an unexpected emergency.',
			body: 'Shadow had an unexpected emergency.',
			goalAmountCents: 100_000,
			status: 'APPROVED',
			visibility: 'PUBLIC',
			isOwnerAnonymous: true,
			ownerDisplayName: `Shadow's Family ${run}`,
			ownerCity: '123 Secret Address Ln',
			ownerId,
			vetHospitalId: hospitalId,
			publishedAt: start,
			deadline
		}
	});
	campAnonId = c3.id;

	const pastStart = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
	const pastDeadline = new Date(pastStart.getTime() + CAMPAIGN_DURATION_MS);
	const c4 = await db.campaign.create({
		data: {
			slug: slugExpired,
			title: `Expired Campaign ${run}`,
			summary: 'Already past deadline.',
			body: 'Already past deadline.',
			goalAmountCents: 50_000,
			status: 'APPROVED',
			visibility: 'PUBLIC',
			ownerId,
			publishedAt: pastStart,
			deadline: pastDeadline
		}
	});
	campExpiredId = c4.id;

	const c5 = await db.campaign.create({
		data: {
			slug: slugPending,
			title: `Pending Campaign ${run}`,
			summary: 'Pending moderation review.',
			body: 'Pending moderation review.',
			goalAmountCents: 50_000,
			status: 'PENDING_REVIEW',
			visibility: 'PUBLIC',
			ownerId
		}
	});
	campPendingId = c5.id;
});

afterAll(async () => {
	await db.campaign.deleteMany({
		where: {
			id: { in: [campHospitalId, campExplicitCityId, campAnonId, campExpiredId, campPendingId] }
		}
	});
	await db.vetHospital.deleteMany({ where: { id: hospitalId } });
	await db.user.deleteMany({ where: { id: { in: [ownerId, otherUserId] } } });
});

describe('owner privacy on public queries', () => {
	it('exposes only first name and city, never last name, email, or street address', async () => {
		const list = await listPublicCampaigns(new Date(), 50, run);
		const serialized = JSON.stringify(list);

		expect(serialized).not.toContain('Vance-Test');
		expect(serialized).not.toContain('Secret Street');
		expect(serialized).not.toContain('23464');
		expect(serialized).not.toContain('123 Secret Address Ln');
		expect(serialized).not.toContain(`${ownerId}@test.dev`);

		const hospFallback = list.find((c) => c.slug === slugHospitalFallback);
		expect(hospFallback).toMatchObject({
			ownerName: 'Elena',
			ownerCity: null
		});

		const explicitCity = list.find((c) => c.slug === slugExplicitCity);
		expect(explicitCity).toMatchObject({
			ownerName: 'Elena',
			ownerCity: `Norfolk-${run}`
		});

		const anon = list.find((c) => c.slug === slugAnonymous);
		expect(anon).toMatchObject({
			ownerName: `Shadow's Family ${run}`,
			ownerCity: null
		});
	});

	it('projects first name and city in findCampaign and listBrowseCampaigns without exposing full owner name', async () => {
		const single = await findCampaign(slugHospitalFallback);
		expect(single).toBeTruthy();
		expect(single?.ownerName).toBe('Elena');
		expect(single?.ownerCity).toBeNull();
		expect(JSON.stringify(single)).not.toContain('Vance-Test');
		expect(JSON.stringify(single)).not.toContain('Secret Street');
		expect(JSON.stringify(single)).not.toContain('Virginia Beach');

		const anonSingle = await findCampaign(slugAnonymous);
		expect(anonSingle?.ownerName).toBe(`Shadow's Family ${run}`);
		expect(anonSingle?.ownerCity).toBeNull();
		expect(JSON.stringify(anonSingle)).not.toContain('Elena');
		const browse = await listBrowseCampaigns(new Date(), 50);
		expect(JSON.stringify(browse)).not.toContain('Vance-Test');
	});

	it('does not leak anonymous owners or hidden last names through search', async () => {
		const byLastName = await listPublicCampaigns(new Date(), 50, 'Vance-Test');
		expect(byLastName.some((c) => c.slug.includes(run))).toBe(false);
		const byFirstName = await listPublicCampaigns(new Date(), 50, `Elena ${run}`);
		expect(byFirstName.some((c) => c.slug === slugHospitalFallback)).toBe(true);
		expect(byFirstName.some((c) => c.slug === slugAnonymous)).toBe(false);

		const byCity = await listPublicCampaigns(new Date(), 50, `Norfolk-${run}`);
		expect(byCity.some((c) => c.slug === slugExplicitCity)).toBe(true);

		const byHospitalCityOnly = await listPublicCampaigns(new Date(), 50, `Virginia Beach`);
		expect(byHospitalCityOnly.some((c) => c.slug === slugHospitalFallback)).toBe(false);
	});
});

describe('owner pause, resume, and withdraw lifecycle', () => {
	it('rejects lifecycle mutations from non-owners', async () => {
		await expect(
			setOwnerCampaignState(campHospitalId, otherUserId, 'PAUSE')
		).rejects.toBeInstanceOf(ValidationError);
		await expect(
			setOwnerCampaignState(campHospitalId, otherUserId, 'WITHDRAW')
		).rejects.toBeInstanceOf(ValidationError);
	});

	it('pauses an approved campaign, hides it from browse, blocks donations, and resumes it', async () => {
		const paused = await setOwnerCampaignState(campHospitalId, ownerId, 'PAUSE');
		expect(paused.status).toBe('PAUSED');

		const listWhilePaused = await listPublicCampaigns(new Date(), 50, run);
		expect(listWhilePaused.some((c) => c.slug === slugHospitalFallback)).toBe(false);

		await expect(
			recordDonation({
				campaignId: campHospitalId,
				amountCents: 1_000,
				status: 'COMPLETED',
				provider: 'SIMULATED',
				providerRef: `sim_paused_${run}`,
				donorName: 'Test Donor'
			})
		).rejects.toBeInstanceOf(ValidationError);

		const resumed = await setOwnerCampaignState(campHospitalId, ownerId, 'RESUME');
		expect(resumed.status).toBe('APPROVED');

		const listAfterResume = await listPublicCampaigns(new Date(), 50, run);
		expect(listAfterResume.some((c) => c.slug === slugHospitalFallback)).toBe(true);
	});

	it('refuses pausing an already-expired campaign and marks it CLOSED', async () => {
		await db.campaign.update({
			where: { id: campExpiredId },
			data: { status: 'APPROVED', closedAt: null }
		});
		await expect(setOwnerCampaignState(campExpiredId, ownerId, 'PAUSE')).rejects.toThrow(
			'ended and cannot be paused'
		);
		const closed = await db.campaign.findUnique({ where: { id: campExpiredId } });
		expect(closed?.status).toBe('CLOSED');
	});

	it('withdraws a campaign: removes from browse/totals/recent donors, blocks donations, and keeps slug lookup for notice', async () => {
		await recordDonation({
			campaignId: campHospitalId,
			amountCents: 2_500,
			status: 'COMPLETED',
			provider: 'SIMULATED',
			providerRef: `sim_before_withdraw_${run}`,
			donorName: `Supporter ${run}`
		});

		const totalsBefore = await getPlatformTotals();
		const withdrawn = await setOwnerCampaignState(campHospitalId, ownerId, 'WITHDRAW');
		expect(withdrawn.status).toBe('WITHDRAWN');
		expect(withdrawn.closedAt).toBeTruthy();

		const listAfterWithdraw = await listPublicCampaigns(new Date(), 50, run);
		expect(listAfterWithdraw.some((c) => c.slug === slugHospitalFallback)).toBe(false);

		const recentDonorsAfter = await listRecentPublicDonors(50);
		expect(recentDonorsAfter.some((d) => d.slug === slugHospitalFallback)).toBe(false);

		const browseDonationsAfter = await listRecentPublicDonations(50);
		expect(browseDonationsAfter.some((d) => d.campaign.slug === slugHospitalFallback)).toBe(false);

		const totalsAfter = await getPlatformTotals();
		expect(totalsAfter.raisedCents).toBe(totalsBefore.raisedCents - 2_500);

		const atLink = await findCampaign(slugHospitalFallback);
		expect(atLink?.status).toBe('WITHDRAWN');
		expect(atLink?.state).toBe('inactive');
		expect(atLink?.live).toBe(false);

		await expect(
			recordDonation({
				campaignId: campHospitalId,
				amountCents: 1_000,
				status: 'COMPLETED',
				provider: 'SIMULATED',
				providerRef: `sim_after_withdraw_${run}`,
				donorName: 'Late Donor'
			})
		).rejects.toBeInstanceOf(ValidationError);

		await expect(setOwnerCampaignState(campHospitalId, ownerId, 'RESUME')).rejects.toBeInstanceOf(
			ValidationError
		);
	});

	it('allows withdrawing a pending campaign and excludes withdrawn campaigns from active owner lookup', async () => {
		await setOwnerCampaignState(campPendingId, ownerId, 'WITHDRAW');
		await setOwnerCampaignState(campExplicitCityId, ownerId, 'WITHDRAW');
		await setOwnerCampaignState(campAnonId, ownerId, 'WITHDRAW');

		const active = await findActiveCampaignForOwner(ownerId);
		expect(active).toBeNull();
	});
});
