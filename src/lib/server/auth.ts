import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

/**
 * `vite build` imports the SSR entry (and so this module) to analyse the app,
 * which means `betterAuth()` has to evaluate before any request exists. CI and
 * production builds have no BETTER_AUTH_SECRET, and better-auth throws when the
 * secret is missing, so supply a throwaway value for the build only. Nothing
 * authenticates while building, and `building` is false in `vite dev` and in the
 * deployed server, so a real secret is still mandatory at runtime.
 */
const secret = env.BETTER_AUTH_SECRET ?? (building ? 'build-time-placeholder' : undefined);

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret,
	database: prismaAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: { enabled: true },
	user: {
		additionalFields: {
			isModerator: {
				type: 'boolean',
				required: false,
				defaultValue: false,
				input: false // never settable via signup/update profile
			},
			isSystem: {
				type: 'boolean',
				required: false,
				defaultValue: false,
				input: false
			}
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
