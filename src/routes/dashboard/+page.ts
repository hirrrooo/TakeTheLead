import { getPlaceholderCampaign, getPlaceholderUser } from '$lib/dashboard/campaigns';
import type { PageLoad } from './$types';

// Placeholder data until auth + the Campaign model land in Prisma.
export const load = (() => {
	return {
		user: getPlaceholderUser(),
		campaign: getPlaceholderCampaign()
	};
}) satisfies PageLoad;
