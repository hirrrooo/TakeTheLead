/**
 * Standalone shim: emulates SvelteKit's $env/dynamic/private for tsx scripts
 * by re-exporting process.env values loaded from .env.
 */
export const env = process.env;
export default { env };
