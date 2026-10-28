import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { closeExpiredCampaigns, getCampaignDeadline } from '$lib/server/db/campaign-lifecycle';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

const ACTIVE_CAMPAIGN_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PAUSED'];

export const load: PageServerLoad = async ({ locals }) => {
	const now = new Date();
	await closeExpiredCampaigns(undefined, now);

	const liveCampaigns = await db.campaign.findMany({
		where: {
			status: 'APPROVED',
			visibility: 'PUBLIC',
			deletedAt: null
		},
		select: {
			id: true,
			slug: true,
			title: true,
			coverImageUrl: true,
			raisedCents: true,
			goalAmountCents: true,
			billAmountCents: true,
			deadline: true,
			publishedAt: true,
			createdAt: true,
			pets: {
				where: { role: 'PRIMARY' },
				select: { pet: { select: { name: true } } }
			}
		},
		orderBy: { createdAt: 'desc' },
		take: 12
	});

	if (!locals.user) {
		return { user: null, hasActiveCampaign: false, liveCampaigns: mapCampaigns(liveCampaigns, now) };
	}

	const campaign = await db.campaign.findFirst({
		where: {
			ownerId: locals.user.id,
			status: { in: [...ACTIVE_CAMPAIGN_STATUSES] },
			deletedAt: null
		},
		select: { id: true },
		orderBy: { createdAt: 'desc' }
	});

	return {
		user: {
			name: locals.user.name ?? locals.user.email.split('@')[0]
		},
		hasActiveCampaign: Boolean(campaign),
		liveCampaigns: mapCampaigns(liveCampaigns, now)
	};
};

function mapCampaigns(
	campaigns: {
		id: string;
		slug: string;
		title: string;
		coverImageUrl: string | null;
		raisedCents: number;
		goalAmountCents: number | null;
		billAmountCents: number | null;
		deadline: Date | null;
		publishedAt: Date | null;
		createdAt: Date;
		pets: { pet: { name: string } }[];
	}[],
	now: Date
) {
	return campaigns.map((c) => {
		const goal = c.goalAmountCents ?? c.billAmountCents ?? 0;
		const deadline = getCampaignDeadline(c);
		return {
			id: c.id,
			slug: c.slug,
			title: c.title,
			coverImageUrl: c.coverImageUrl,
			petName: c.pets[0]?.pet.name ?? null,
			raisedCents: c.raisedCents,
			goalCents: goal,
			percent: goal > 0 ? Math.min(100, Math.round((c.raisedCents / goal) * 100)) : 0,
			daysLeft: Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000))
		};
	});
}

export const actions: Actions = {
	signOut: async (event) => {
		await auth.api.signOut({ headers: event.request.headers });
		redirect(303, '/login');
	}
};
