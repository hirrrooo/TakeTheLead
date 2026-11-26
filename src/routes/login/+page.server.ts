import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/dashboard');
	return {};
};

export const actions: Actions = {
	signInEmail: async (event) => {
		const formData = await event.request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const rememberMe = formData.get('remember') === 'on';

		try {
			await auth.api.signInEmail({
				body: { email, password, rememberMe, callbackURL: '/dashboard' },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, {
					message: error.message || 'Unable to sign in. Please check your credentials.',
					mode: 'signin' as const
				});
			}
			return fail(500, {
				message: 'Something went wrong while signing in. Please try again.',
				mode: 'signin' as const
			});
		}

		return { success: true as const, mode: 'signin' as const };
	},
	signUpEmail: async (event) => {
		const formData = await event.request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const name = String(formData.get('name') ?? '').trim();

		try {
			await auth.api.signUpEmail({
				body: { email, password, name, callbackURL: '/dashboard' },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, {
					message: error.message || 'Unable to create your account.',
					mode: 'signup' as const
				});
			}
			return fail(500, {
				message: 'Something went wrong while creating your account. Please try again.',
				mode: 'signup' as const
			});
		}

		return { success: true as const, mode: 'signup' as const };
	}
};
