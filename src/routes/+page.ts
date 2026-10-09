import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// The dashboard is the signed-in home page.
export const load = (() => {
	redirect(307, '/dashboard');
}) satisfies PageLoad;
