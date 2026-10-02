/**
 * Module-resolution hook so standalone tsx scripts (prisma/verify*.ts) can
 * import server code that uses SvelteKit's `$lib/...` and `$env/...` aliases.
 * Used via: npx tsx --import ./scripts/tsx-svelte-aliases.mjs
 */
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';

const LIB = new URL('../src/lib/', import.meta.url);
const ENV_SHIM = new URL('./env-dynamic-private-shim.mjs', import.meta.url).href;

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === '$env/dynamic/private' || specifier === '$env/static/private') {
			return { url: ENV_SHIM, shortCircuit: true };
		}
		if (specifier === '$lib' || specifier.startsWith('$lib/')) {
			const base = specifier.slice('$lib'.length).replace(/^\//, '').replace(/\\/g, '/');
			for (const candidate of [base + '.ts', base + '/index.ts']) {
				const url = new URL(candidate, LIB);
				if (existsSync(url)) return { url: url.href, shortCircuit: true };
			}
		}
		return nextResolve(specifier, context);
	}
});
