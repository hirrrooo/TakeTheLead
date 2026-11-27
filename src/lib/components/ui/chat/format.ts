export type InlineRun = {
	id: number;
	bold: boolean;
	italic: boolean;
	text: string;
};

export type ChatLine = {
	id: number;
	runs: InlineRun[];
};

export type ChatBlock =
	| { id: number; kind: 'paragraph'; lines: ChatLine[] }
	| { id: number; kind: 'list'; ordered: boolean; start: number; items: ChatLine[] };

function findClosing(text: string, marker: string, from: number): number {
	let pos = from;
	while (pos < text.length) {
		const idx = text.indexOf(marker, pos);
		if (idx === -1) return -1;
		// Do not match a marker that is part of a longer run of asterisks (e.g. `***` inside `**`).
		if (text[idx - 1] !== '*' && text[idx + marker.length] !== '*') return idx;
		pos = idx + 1;
	}
	return -1;
}

export function parseInlineRuns(text: string, nextId?: () => number): InlineRun[] {
	let localId = 0;
	const alloc = nextId ?? (() => localId++);
	const runs: InlineRun[] = [];
	let plainStart = 0;
	let i = 0;

	const flushPlain = (end: number) => {
		if (end > plainStart) {
			runs.push({ id: alloc(), bold: false, italic: false, text: text.slice(plainStart, end) });
		}
	};

	while (i < text.length) {
		if (text[i] !== '*') {
			i++;
			continue;
		}
		// Skip runs of 4+ asterisks (treat literally).
		if (text.startsWith('****', i)) {
			while (text[i] === '*') i++;
			continue;
		}
		// Only open a marker if it is not immediately preceded by `*`.
		if (i > 0 && text[i - 1] === '*') {
			i++;
			continue;
		}

		let marker: '***' | '**' | '*' = '*';
		if (text.startsWith('***', i)) marker = '***';
		else if (text.startsWith('**', i)) marker = '**';

		const end = findClosing(text, marker, i + marker.length);
		if (end > i + marker.length) {
			const inner = text.slice(i + marker.length, end);
			if (!/^\s|\s$/.test(inner) && !/^\*+$/.test(inner)) {
				flushPlain(i);
				runs.push({
					id: alloc(),
					bold: marker !== '*',
					italic: marker !== '**',
					text: inner
				});
				i = end + marker.length;
				plainStart = i;
				continue;
			}
		}
		i += marker.length;
	}

	flushPlain(text.length);
	return runs;
}

export function parseChatBlocks(text: string): ChatBlock[] {
	let id = 0;
	const nextId = () => id++;
	const blocks: ChatBlock[] = [];
	let paraLines: ChatLine[] = [];
	let list: { ordered: boolean; start: number; items: ChatLine[] } | null = null;

	const flushPara = () => {
		if (paraLines.length) {
			blocks.push({ id: nextId(), kind: 'paragraph', lines: paraLines });
			paraLines = [];
		}
	};

	const flushList = () => {
		if (list) {
			blocks.push({ id: nextId(), kind: 'list', ...list });
			list = null;
		}
	};

	for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
		if (!line.trim()) {
			flushPara();
			flushList();
			continue;
		}
		const ol = line.match(/^\s*(\d+)\.\s+(.+)$/);
		if (ol) {
			flushPara();
			if (!list || !list.ordered) {
				flushList();
				list = { ordered: true, start: Number(ol[1]), items: [] };
			}
			list.items.push({ id: nextId(), runs: parseInlineRuns(ol[2], nextId) });
			continue;
		}
		const ul = line.match(/^\s*[-*•]\s+(.+)$/);
		if (ul) {
			flushPara();
			if (!list || list.ordered) {
				flushList();
				list = { ordered: false, start: 1, items: [] };
			}
			list.items.push({ id: nextId(), runs: parseInlineRuns(ul[1], nextId) });
			continue;
		}
		flushList();
		const heading = line.match(/^\s*#{1,3}\s+(.+)$/);
		if (heading) {
			paraLines.push({
				id: nextId(),
				runs: parseInlineRuns(heading[1].trim(), nextId).map((r) => ({ ...r, bold: true }))
			});
			continue;
		}
		paraLines.push({ id: nextId(), runs: parseInlineRuns(line, nextId) });
	}

	flushPara();
	flushList();
	return blocks;
}

export function shouldShowBusyNotice(message: {
	aiUsed?: boolean;
	aiFallback?: boolean;
	sources?: unknown[];
}): boolean {
	return message.aiFallback ?? (message.aiUsed === false && Boolean(message.sources?.length));
}

const SOURCE_SUFFIX =
	/\s+(?:charitable pet foundation|foundation|relief urgent care grant|urgent care grant|veterinary financing|payment plans|medical assistance program|emergency medical fund|clinic)$/i;

function normalizeMatchText(s: string): string {
	return s.toLowerCase().replace(/[‘’`]/g, "'").replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim();
}

export function visibleSources<T extends { number: number; name: string }>(
	reply: string,
	sources?: T[]
): T[] {
	if (!sources?.length) return [];
	const cited = new Set<number>();
	for (const m of reply.matchAll(/\[([\d,\s]+)\]/g)) {
		for (const n of m[1].split(',')) {
			const num = Number(n.trim());
			if (Number.isInteger(num) && num > 0) cited.add(num);
		}
	}
	const normReply = normalizeMatchText(reply);
	const matched = sources.filter((s) => {
		if (cited.has(s.number)) return true;
		const full = normalizeMatchText(s.name);
		const base = full
			.split(' - ')[0]
			.replace(/,\s*(?:va\s+)?inc\.?$/i, '')
			.trim();
		const noThe = base.replace(/^the\s+/, '');
		const variants = new Set<string>([full, full.replace(/^the\s+/, ''), base, noThe]);
		const stem = noThe.replace(SOURCE_SUFFIX, '').trim();
		if (stem && (stem.includes(' ') || stem === 'redrover' || stem === 'carecredit')) {
			variants.add(stem);
		}
		for (const v of variants) {
			if (v.length < 3) continue;
			const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(normReply)) return true;
		}
		return false;
	});
	return matched.length ? matched : sources;
}
