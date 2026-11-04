import { describe, expect, it } from 'vitest';
import {
	CAMPAIGN_DURATION_MS,
	campaignEndDate,
	getCampaignState,
	type CampaignTiming
} from './campaign-state';

const start = new Date('2026-10-01T12:00:00.000Z');
const at = (offsetMs: number) => new Date(start.getTime() + offsetMs);

const approved = (overrides: Partial<CampaignTiming> = {}): CampaignTiming => ({
	status: 'APPROVED',
	createdAt: start,
	publishedAt: start,
	deadline: new Date(start.getTime() + CAMPAIGN_DURATION_MS),
	...overrides
});

describe('campaign end date', () => {
	it('is 30 days after the start when no deadline is stored', () => {
		const end = campaignEndDate({ createdAt: start, publishedAt: start, deadline: null });
		expect(end.getTime() - start.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
	});

	it('falls back to createdAt when never published', () => {
		const end = campaignEndDate({ createdAt: start, publishedAt: null, deadline: null });
		expect(end.getTime()).toBe(start.getTime() + CAMPAIGN_DURATION_MS);
	});
});

describe('getCampaignState', () => {
	it('is upcoming before the start date', () => {
		expect(getCampaignState(approved(), at(-1))).toBe('upcoming');
	});

	it('is live from the start until the last millisecond of day 30', () => {
		expect(getCampaignState(approved(), at(0))).toBe('live');
		expect(getCampaignState(approved(), at(CAMPAIGN_DURATION_MS - 1))).toBe('live');
	});

	it('is ended exactly 30 days after the start', () => {
		expect(getCampaignState(approved(), at(CAMPAIGN_DURATION_MS))).toBe('ended');
		expect(getCampaignState(approved(), at(CAMPAIGN_DURATION_MS + 1))).toBe('ended');
	});

	it('derives the same result from a legacy row with no deadline', () => {
		const legacy = approved({ deadline: null });
		expect(getCampaignState(legacy, at(CAMPAIGN_DURATION_MS - 1))).toBe('live');
		expect(getCampaignState(legacy, at(CAMPAIGN_DURATION_MS))).toBe('ended');
	});

	it('reports ended for a stored CLOSED campaign', () => {
		expect(getCampaignState(approved({ status: 'CLOSED' }), at(1))).toBe('ended');
	});

	it('ends paused and pending campaigns too, without needing a sweep', () => {
		expect(getCampaignState(approved({ status: 'PAUSED' }), at(1))).toBe('paused');
		expect(getCampaignState(approved({ status: 'PAUSED' }), at(CAMPAIGN_DURATION_MS))).toBe(
			'ended'
		);
		expect(getCampaignState(approved({ status: 'PENDING_REVIEW' }), at(1))).toBe('pending');
		expect(getCampaignState(approved({ status: 'PENDING_REVIEW' }), at(CAMPAIGN_DURATION_MS))).toBe(
			'ended'
		);
	});

	it('is inactive for drafts, rejected and withdrawn campaigns', () => {
		for (const status of ['DRAFT', 'REJECTED', 'WITHDRAWN', 'ARCHIVED']) {
			expect(getCampaignState(approved({ status }), at(1))).toBe('inactive');
		}
	});
});
