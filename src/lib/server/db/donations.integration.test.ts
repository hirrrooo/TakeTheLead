/**
 * Integration test: donations update totals, and campaigns end after 30 days.
 *
 * Runs against the database in DATABASE_URL (CI: after `npm run db:deploy`).
 * Every row uses a unique prefix and is deleted afterwards.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '$lib/server/db';
import {
	CAMPAIGN_DURATION_MS,
	findCampaign,
	getPlatformTotals,
	listPublicCampaigns,
	listRecentDonors
} from '$lib/server/db/campaigns';
import { recordDonation, ValidationError } from '$lib/server/db/queries';

const run = randomUUID().slice(0, 8);
const ownerId = `it_owner_${run}`;
const memberId = `it_member_${run}`;
const slug = `it-campaign-${run}`;
let campaignId = '';

const start = new Date(Date.now() - 24 * 60 * 60 * 1000); // started yesterday
const day30 = new Date(start.getTime() + CAMPAIGN_DURATION_MS);

beforeAll(async () => {
	await db.user.createMany({
		data: [
			{ id: ownerId, email: `${ownerId}@test.dev`, name: 'Owner' },
			{ id: memberId, email: `${memberId}@test.dev`, name: 'Member Donor' }
		]
	});
	const campaign = await db.campaign.create({
		data: {
			slug,
			title: 'Integration campaign',
			body: 'Integration test campaign body',
			goalAmountCents: 100_000,
			status: 'APPROVED',
			ownerId,
			publishedAt: start,
			deadline: day30
		}
	});
	campaignId = campaign.id;
});

afterAll(async () => {
	await db.campaign.deleteMany({ where: { id: campaignId } }); // cascades donations
	await db.user.deleteMany({ where: { id: { in: [ownerId, memberId] } } });
});

describe('donations', () => {
	it('records a guest donation and updates the raised total', async () => {
		await recordDonation({
			campaignId,
			amountCents: 2_500,
			status: 'COMPLETED',
			provider: 'SIMULATED',
			providerRef: `sim_${run}_guest`,
			donorName: 'Guest Gail'
		});

		const campaign = await findCampaign(slug);
		expect(campaign?.raisedCents).toBe(2_500);
		expect(campaign?.live).toBe(true);
		expect((await listRecentDonors(campaignId))[0]).toMatchObject({
			name: 'Guest Gail',
			amountCents: 2_500
		});
	});

	it('records a member donation and adds to the total', async () => {
		await recordDonation({
			campaignId,
			amountCents: 1_000,
			status: 'COMPLETED',
			provider: 'SIMULATED',
			providerRef: `sim_${run}_member`,
			donorUserId: memberId
		});

		expect((await findCampaign(slug))?.raisedCents).toBe(3_500);
		expect((await listRecentDonors(campaignId))[0].name).toBe('Member Donor');
	});

	it('shows anonymous donors as Anonymous', async () => {
		await recordDonation({
			campaignId,
			amountCents: 500,
			status: 'COMPLETED',
			provider: 'SIMULATED',
			providerRef: `sim_${run}_anon`,
			donorName: 'Secret Sam',
			isAnonymous: true
		});
		expect((await listRecentDonors(campaignId))[0].name).toBe('Anonymous');
	});

	it('does not double-count a repeated providerRef', async () => {
		const before = (await findCampaign(slug))?.raisedCents;
		const input = {
			campaignId,
			amountCents: 700,
			status: 'COMPLETED' as const,
			provider: 'SIMULATED' as const,
			providerRef: `sim_${run}_dup`,
			donorName: 'Twice Tina'
		};
		await recordDonation(input);
		await recordDonation(input);
		expect((await findCampaign(slug))?.raisedCents).toBe((before ?? 0) + 700);
	});

	it('includes the campaign in public totals while live', async () => {
		const totals = await getPlatformTotals();
		expect(totals.liveCampaigns).toBeGreaterThan(0);
		expect(totals.raisedCents).toBeGreaterThanOrEqual(4_700);
	});
});

describe('donation messages', () => {
	it('shows a public message to everyone', async () => {
		await recordDonation({
			campaignId,
			amountCents: 200,
			status: 'COMPLETED',
			provider: 'SIMULATED',
			providerRef: `sim_${run}_msg_public`,
			donorName: 'Open Olive',
			message: `Public hello ${run}`,
			isMessagePrivate: false
		});

		const publicView = await listRecentDonors(campaignId, 50);
		expect(publicView.find((d) => d.message === `Public hello ${run}`)).toBeTruthy();
	});

	it('hides a private message from the public but shows it to the owner', async () => {
		await recordDonation({
			campaignId,
			amountCents: 300,
			status: 'COMPLETED',
			provider: 'SIMULATED',
			providerRef: `sim_${run}_msg_private`,
			donorName: 'Quiet Quinn',
			message: `Secret note ${run}`,
			isMessagePrivate: true
		});

		const publicView = await listRecentDonors(campaignId, 50);
		const publicRow = publicView.find((d) => d.name === 'Quiet Quinn');
		expect(publicRow?.message).toBeNull();
		expect(publicRow?.messagePrivate).toBe(false);
		expect(JSON.stringify(publicView)).not.toContain(`Secret note ${run}`);

		const ownerView = await listRecentDonors(campaignId, 50, { includePrivateMessages: true });
		const ownerRow = ownerView.find((d) => d.name === 'Quiet Quinn');
		expect(ownerRow?.message).toBe(`Secret note ${run}`);
		expect(ownerRow?.messagePrivate).toBe(true);
	});

	it('does not mark a donation private when there is no message', async () => {
		const donation = await recordDonation({
			campaignId,
			amountCents: 100,
			status: 'COMPLETED',
			provider: 'SIMULATED',
			providerRef: `sim_${run}_msg_none`,
			donorName: 'No Note Nia',
			isMessagePrivate: true
		});
		expect(donation.isMessagePrivate).toBe(false);
	});
});

describe('30-day end', () => {
	it('still accepts a donation one millisecond before day 30', async () => {
		await recordDonation({
			campaignId,
			amountCents: 100,
			status: 'COMPLETED',
			provider: 'SIMULATED',
			providerRef: `sim_${run}_last`,
			donorName: 'Last Minute',
			now: new Date(day30.getTime() - 1)
		});
	});

	it('rejects a donation at day 30 and marks the campaign ended', async () => {
		await expect(
			recordDonation({
				campaignId,
				amountCents: 100,
				status: 'COMPLETED',
				provider: 'SIMULATED',
				providerRef: `sim_${run}_late`,
				donorName: 'Too Late',
				now: day30
			})
		).rejects.toBeInstanceOf(ValidationError);

		const campaign = await findCampaign(slug, day30);
		expect(campaign?.ended).toBe(true);
		expect(campaign?.live).toBe(false);
		expect(campaign?.status).toBe('CLOSED');
	});

	it('lists the campaign as ended with its final total', async () => {
		const list = await listPublicCampaigns(new Date(day30.getTime() + 1));
		const entry = list.find((c) => c.slug === slug);
		expect(entry?.status).toBe('ended');
		expect(entry?.raisedCents).toBeGreaterThan(0);
	});
});

describe('campaign search', () => {
	it('finds a campaign by title, case-insensitively, and by multiple words', async () => {
		const byTitle = await listPublicCampaigns(day30, 50, 'INTEGRATION CAMPAIGN');
		expect(byTitle.some((c) => c.slug === slug)).toBe(true);

		const byBody = await listPublicCampaigns(day30, 50, 'integration test body');
		expect(byBody.some((c) => c.slug === slug)).toBe(true);
	});

	it('finds a campaign by owner name', async () => {
		const results = await listPublicCampaigns(day30, 50, 'Owner');
		expect(results.some((c) => c.slug === slug)).toBe(true);
	});

	it('returns nothing for a word that matches no campaign', async () => {
		const results = await listPublicCampaigns(day30, 50, `zzz-no-match-${run}`);
		expect(results).toHaveLength(0);
	});

	it('requires every word to match', async () => {
		const results = await listPublicCampaigns(day30, 50, `integration zzz-no-match-${run}`);
		expect(results.some((c) => c.slug === slug)).toBe(false);
	});

	it('treats % as plain input, not a wildcard', async () => {
		const withPercent = await listPublicCampaigns(day30, 50, '%');
		const withoutQuery = await listPublicCampaigns(day30, 50, '');
		expect(withPercent.length).toBe(withoutQuery.length);
	});
});
