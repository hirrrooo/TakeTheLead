/**
 * Launcher for `prisma studio`.
 * Prisma 7 rejects relative SQLite URLs ("file:local.db") in Studio, so we
 * resolve DATABASE_URL against the project root and pass an absolute
 * file:// URL via --url. Works for any teammate's checkout location.
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const raw = process.env.DATABASE_URL;
if (!raw) {
	console.error('DATABASE_URL is not set (check .env)');
	process.exit(1);
}

let url = raw;
if (raw.startsWith('file:')) {
	const rel = raw.slice('file:'.length).replace(/^\//, '');
	url = pathToFileURL(resolve(process.cwd(), rel)).href;
}

const args = [createRequire(import.meta.url).resolve('prisma/build/index.js'), 'studio', '--url', url, ...process.argv.slice(2)];
const child = spawn(process.execPath, args, { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
