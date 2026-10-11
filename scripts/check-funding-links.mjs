#!/usr/bin/env node
/**
 * Re-checks every funding-source and vet-hospital link in the database
 * (TTL-208 hygiene, TTL-308 refresh).
 *
 *   npm run db:check-links              # report only
 *   npm run db:check-links -- --stamp   # also write lastCheckedAt
 *   npm run db:check-links -- --stamp --verified   # and verifiedAt, for links that passed
 *   npm run db:check-links -- --table=funding      # just one directory
 *
 * What this can and cannot tell you
 * --------------------------------
 * A 200 only proves the domain resolves and serves a page. Several pet funds
 * that are permanently closed (Brown Dog Foundation, Magic Bullet Fund, Zeus
 * Oncology Fund) still serve a perfectly healthy-looking page saying so. So
 * the script greps the page text for "permanently closed" / "dissolved" style
 * wording and prints the sentence it matched — but that is a heuristic in both
 * directions: it can fire on a rescue's own story text, and a 403/429 is often
 * just bot protection on a site that is fine. Read the printed snippet (or open
 * the page) before changing a row, and pass --verified deliberately; the script
 * never marks a link verified on its own.
 *
 * Runs on plain `node` (>= 18 for global fetch) with no Prisma client, so it
 * works on the Linux server as well as locally.
 */
import 'dotenv/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ICONS = {
	ok: 'ok     ',
	paused: 'PAUSED ',
	closed: 'CLOSED ',
	parked: 'PARKED ',
	http: 'HTTP   ',
	error: 'FAIL   '
};
/** Statuses that usually mean "a robot asked", not "the page is gone". */
const BLOCKED_CODES = new Set([401, 403, 429, 503]);
const args = process.argv.slice(2);
const STAMP = args.includes('--stamp');
const STAMP_VERIFIED = args.includes('--verified');
const onlyTable = flagValue('--table');

function flagValue(name) {
	const hit = args.find((a) => a.startsWith(`${name}=`));
	return hit ? hit.slice(name.length + 1) : null;
}

const raw = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
const rel = raw
	.replace(/^file:/, '')
	.replace(/^\.\//, '')
	.split('?')[0];
const db = new Database(resolve(ROOT, rel), { readonly: !STAMP });

/**
 * Words that mean "this program is gone" even though the page loads fine.
 * These are deliberately narrow: a loose phrase matches campaign stories on
 * healthy sites (waggle.org's homepage literally tells rescue stories), so each
 * pattern has to name the organisation or program, not just the animal.
 */
const CLOSED_PATTERNS = [
	/permanently closed/i,
	/has closed(?:\s+(?:its\s+)?(?:doors|operations))?/i,
	/cease[d]? operations/i,
	/ceasing operations/i,
	/no longer (?:providing|offering|accepting|operating)/i,
	/now defunct/i,
	/\b(?:we|our|the)\s+(?:program|foundation|fund|organization|organisation|site)?\s*(?:has\s+)?(?:been\s+)?shut(?:ting)?\s+down/i,
	/dissolv(?:ed|ing)/i,
	/suspended (?:our )?(?:programs|operations|applications)/i
];

/**
 * Words that mean "live, but not taking applications right now". A weekly
 * intake cycle (RedRover closes its portal every Friday and reopens Monday) is
 * not a pause, so a reopen date has to look like a date.
 */
const PAUSED_PATTERNS = [
	/temporar(?:y|ily) closed/i,
	/applications (?:are )?(?:temporarily )?closed/i,
	/not currently accepting applications/i,
	/reopen(?:s|ing)? (?:on |in |after )?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}|\d+\s*(?:day|week|month)s?)/i,
	/wait ?list is closed/i
];

/** The two directories keep their link in differently-named columns. */
const TABLES = {
	funding: { table: 'funding_source', label: 'Funding sources', urlColumn: 'url' },
	hospital: { table: 'vet_hospital', label: 'Vet hospitals', urlColumn: 'website' }
};

const results = [];

for (const key of Object.keys(TABLES)) {
	if (onlyTable && onlyTable !== key) continue;
	const { table, label, urlColumn } = TABLES[key];
	const info = db.prepare(`PRAGMA table_info(${table})`).all();
	if (info.length === 0) {
		console.warn(`skip ${label}: table ${table} does not exist yet (run npm run db:push)`);
		continue;
	}
	const hasColumn = (name) => info.some((r) => r.name === name);
	if (!hasColumn(urlColumn)) {
		console.warn(`skip ${label}: ${table}.${urlColumn} does not exist yet (run npm run db:push)`);
		continue;
	}

	// Retired listings stay in the database for history but are not re-checked.
	const retired = hasColumn('retiredAt') ? 'AND retiredAt IS NULL' : '';
	console.log(`\n${label}`);
	const rows = db
		.prepare(
			`SELECT id, name, ${urlColumn} AS url, verifiedAt, lastCheckedAt FROM ${table}
			 WHERE ${urlColumn} IS NOT NULL AND id LIKE 'seed_%' ${retired} ORDER BY name`
		)
		.all();

	for (const row of rows) {
		const outcome = await check(row.url);
		results.push({ ...outcome, table, id: row.id, name: row.name });
		print(row, outcome);
		if (STAMP && outcome.status !== 'error') {
			await stamp(table, row.id, outcome);
		}
	}
}

/** Fetch one URL and classify it. Never throws. */
async function check(link) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 20_000);
	try {
		const res = await fetch(link, {
			redirect: 'follow',
			signal: controller.signal,
			headers: {
				// Some charity sites 403 a bare node user-agent.
				'user-agent':
					'Mozilla/5.0 (compatible; TakeTheLeadLinkChecker/1.0; https://takethelead.dev)',
				accept: 'text/html,application/xhtml+xml'
			}
		});
		const body = (await res.text()).slice(0, 200_000);

		if (!res.ok) {
			// 403/429 on a healthy site usually means bot protection, not a dead link.
			const hint = BLOCKED_CODES.has(res.status)
				? ' (often bot protection — open it in a browser)'
				: '';
			return { status: 'http', code: `${res.status}`, note: `${res.statusText}${hint}`, ok: false };
		}
		if (
			/domain (?:is )?for sale|buy this domain|has been recently registered|under construction/i.test(
				body
			)
		) {
			return {
				status: 'parked',
				code: `${res.status}`,
				note: 'page looks like a parked domain',
				ok: false
			};
		}
		const closed = firstMatch(body, CLOSED_PATTERNS);
		const paused = firstMatch(body, PAUSED_PATTERNS);
		if (closed)
			return { status: 'closed', code: `${res.status}`, note: snippet(body, closed), ok: false };
		if (paused)
			return { status: 'paused', code: `${res.status}`, note: snippet(body, paused), ok: true };
		return { status: 'ok', code: `${res.status}`, note: '', ok: true };
	} catch (error) {
		const code = error?.cause?.code ?? error?.name ?? 'error';
		return { status: 'error', code: String(code), note: error?.message ?? '', ok: false };
	} finally {
		clearTimeout(timer);
	}
}

function firstMatch(body, patterns) {
	return patterns.find((p) => p.test(body));
}

/**
 * Prints the actual sentence the pattern matched, not the pattern. These are
 * heuristics over page text, so a human has to read the snippet before
 * trusting or retiring a link — the point is to say where to look.
 */
function snippet(body, pattern) {
	const at = body.search(pattern);
	const start = Math.max(0, at - 70);
	const text = body
		.slice(start, at + 140)
		.replace(/<[^>]*>/g, ' ')
		.replace(/&[a-z]+;/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return `needs a human — page says "...${text}..."`;
}

function print(row, o) {
	const badge = ICONS[o.status] ?? o.status;
	const extra = o.note ? `  ${o.note}` : '';
	console.log(`  ${badge} [${o.code}] ${row.name}${extra}`);
}

async function stamp(table, id, o) {
	const now = new Date().toISOString();
	// Prisma stores these columns in camelCase, so the raw SQL must match.
	const sets = [`lastCheckedAt = '${now}'`];
	// verifiedAt means "a human confirmed this", so it needs --verified too.
	if (STAMP_VERIFIED && o.status === 'ok') sets.push(`verifiedAt = '${now}'`);
	db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`).run(id);
}

db.close();

const bad = results.filter((r) => !r.ok);
const paused = results.filter((r) => r.status === 'paused');
console.log(
	`\n${results.length} links checked: ${results.length - bad.length - paused.length} clean, ` +
		`${paused.length} paused, ${bad.length} broken or closed.`
);
if (bad.length > 0) {
	console.log('Broken or closed links need a human: replace the row or set retiredAt.');
	process.exitCode = 1;
}
if (!STAMP) console.log('(report only — pass --stamp to write lastCheckedAt)');
