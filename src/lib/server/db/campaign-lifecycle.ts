import { db } from '$lib/server/db';

export const CAMPAIGN_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function closeExpiredCampaigns(ownerId?: string, now = new Date()) {
	const legacyDeadline = new Date(now.getTime() - CAMPAIGN_DURATION_MS);
	const expired = await db.campaign.findMany({
		where: {
			...(ownerId ? { ownerId } : {}),
			status: { in: ['APPROVED', 'PAUSED'] },
			deletedAt: null,
			OR: [
				{ deadline: { lte: now } },
				{
					deadline: null,
					OR: [
						{ publishedAt: { lte: legacyDeadline } },
						{ publishedAt: null, createdAt: { lte: legacyDeadline } }
					]
				}
			]
		},
		select: { id: true, deadline: true, publishedAt: true, createdAt: true }
	});

	const results = await Promise.all(
		expired.map((campaign) => {
			const start = campaign.publishedAt ?? campaign.createdAt;
			const deadline = campaign.deadline ?? new Date(start.getTime() + CAMPAIGN_DURATION_MS);
			return db.campaign.updateMany({
				where: {
					id: campaign.id,
					status: { in: ['APPROVED', 'PAUSED'] }
				},
				data: { status: 'CLOSED', closedAt: deadline }
			});
		})
	);

	return results.reduce((count, result) => count + result.count, 0);
}

export function getCampaignDeadline(campaign: {
	createdAt: Date;
	publishedAt: Date | null;
	deadline: Date | null;
}) {
	return (
		campaign.deadline ??
		new Date((campaign.publishedAt ?? campaign.createdAt).getTime() + CAMPAIGN_DURATION_MS)
	);
}
