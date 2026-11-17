/**
 * Pure campaign timing rules. No database or framework imports, so they can be
 * unit-tested without a Prisma client.
 *
 * A campaign runs for 30 days from its start (publishedAt, or createdAt when it
 * was never published). `deadline` is the stored end; when it is null the end is
 * derived. State is always computed from the clock at read time, so nothing has
 * to run on a schedule: a campaign is "ended" the moment `now >= end`.
 */

export const CAMPAIGN_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export interface CampaignTiming {
	status: string;
	createdAt: Date;
	publishedAt: Date | null;
	deadline: Date | null;
}

export type CampaignState =
	| 'live' //     approved, started, before its end
	| 'upcoming' // approved, start date in the future
	| 'ended' //    30 days elapsed, or already CLOSED
	| 'paused'
	| 'pending' //  awaiting moderation, window still open
	| 'inactive'; // draft / rejected / withdrawn / archived

export function campaignStartDate(campaign: Pick<CampaignTiming, 'createdAt' | 'publishedAt'>) {
	return campaign.publishedAt ?? campaign.createdAt;
}

export function campaignEndDate(
	campaign: Pick<CampaignTiming, 'createdAt' | 'publishedAt' | 'deadline'>
) {
	return (
		campaign.deadline ?? new Date(campaignStartDate(campaign).getTime() + CAMPAIGN_DURATION_MS)
	);
}

export function getCampaignState(campaign: CampaignTiming, now: Date): CampaignState {
	if (campaign.status === 'CLOSED') return 'ended';

	switch (campaign.status) {
		case 'APPROVED':
		case 'PAUSED':
		case 'PENDING_REVIEW': {
			if (campaignEndDate(campaign) <= now) return 'ended';
			if (campaign.status === 'PAUSED') return 'paused';
			if (campaign.status === 'PENDING_REVIEW') return 'pending';
			return campaignStartDate(campaign) <= now ? 'live' : 'upcoming';
		}
		default:
			return 'inactive';
	}
}

export const isCampaignLive = (campaign: CampaignTiming, now: Date) =>
	getCampaignState(campaign, now) === 'live';

export const isCampaignEnded = (campaign: CampaignTiming, now: Date) =>
	getCampaignState(campaign, now) === 'ended';
