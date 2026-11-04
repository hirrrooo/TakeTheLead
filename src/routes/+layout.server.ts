import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	viewer: locals.user ? { name: locals.user.name ?? locals.user.email.split('@')[0] } : null
});
