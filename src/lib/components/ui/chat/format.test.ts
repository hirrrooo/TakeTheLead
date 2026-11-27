import { describe, expect, it } from 'vitest';
import { parseChatBlocks, parseInlineRuns, shouldShowBusyNotice, visibleSources } from './format';

describe('parseInlineRuns', () => {
	it('parses bold and italic spans while preserving plain text', () => {
		const runs = parseInlineRuns("1. **Frankie's Friends** offers *urgent* care and **grants**.");
		expect(runs.map(({ bold, italic, text }) => ({ bold, italic, text }))).toEqual([
			{ bold: false, italic: false, text: '1. ' },
			{ bold: true, italic: false, text: "Frankie's Friends" },
			{ bold: false, italic: false, text: ' offers ' },
			{ bold: false, italic: true, text: 'urgent' },
			{ bold: false, italic: false, text: ' care and ' },
			{ bold: true, italic: false, text: 'grants' },
			{ bold: false, italic: false, text: '.' }
		]);
	});

	it('leaves unclosed markers, math asterisks, HTML tags, and markdown links as literal text', () => {
		const runs = parseInlineRuns(
			'**unclosed **** 3 * 4 <script>alert(1)</script> [click](https://evil.example)'
		);
		expect(runs.every((r) => !r.bold && !r.italic)).toBe(true);
		expect(runs.map((r) => r.text).join('')).toBe(
			'**unclosed **** 3 * 4 <script>alert(1)</script> [click](https://evil.example)'
		);
	});
});

describe('parseChatBlocks', () => {
	it('parses intro paragraph, numbered list with bold org names, and closing paragraph without blank lines between intro and list', () => {
		const input = [
			'Here are a few grant options:',
			'1. **Frankie’s Friends** – National grant [1]',
			'2. **The Mosby Foundation** – Virginia charity [6]',
			'',
			'Check each site for current rules.'
		].join('\n');

		const blocks = parseChatBlocks(input);
		expect(blocks).toHaveLength(3);
		expect(blocks[0].kind).toBe('paragraph');
		expect(blocks[1]).toMatchObject({
			kind: 'list',
			ordered: true,
			start: 1
		});
		if (blocks[1].kind === 'list') {
			expect(blocks[1].items).toHaveLength(2);
			expect(blocks[1].items[0].runs[0]).toMatchObject({ bold: true, text: 'Frankie’s Friends' });
			expect(blocks[1].items[1].runs[0]).toMatchObject({
				bold: true,
				text: 'The Mosby Foundation'
			});
		}
		expect(blocks[2].kind).toBe('paragraph');
	});

	it('parses bullet lists using - or * without treating bold items as italic', () => {
		const input = [
			'- **RedRover** – Up to $500 [2]',
			'* **[4] Animal Resources** – Local help'
		].join('\n');

		const blocks = parseChatBlocks(input);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].kind).toBe('list');
		if (blocks[0].kind === 'list') {
			expect(blocks[0].ordered).toBe(false);
			expect(blocks[0].items).toHaveLength(2);
			expect(blocks[0].items[0].runs[0]).toMatchObject({ bold: true, text: 'RedRover' });
			expect(blocks[0].items[1].runs[0]).toMatchObject({
				bold: true,
				text: '[4] Animal Resources'
			});
		}
	});

	it('assigns unique block and run ids across a message', () => {
		const blocks = parseChatBlocks('First **line**\n\n- **Second** item\n- Third');
		const blockIds = new Set(blocks.map((b) => b.id));
		expect(blockIds.size).toBe(blocks.length);
	});

	it('handles bold-italic, headings, empty strings, and custom ordered list start', () => {
		expect(parseChatBlocks('')).toEqual([]);

		const blocks = parseChatBlocks('### **Next steps**\n2. ***Urgent*** care\n3. Normal');
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toMatchObject({ kind: 'paragraph' });
		if (blocks[0].kind === 'paragraph') {
			expect(blocks[0].lines[0].runs.every((r) => r.bold)).toBe(true);
			expect(blocks[0].lines[0].runs.map((r) => r.text).join('')).toBe('Next steps');
		}
		expect(blocks[1]).toMatchObject({ kind: 'list', ordered: true, start: 2 });
		if (blocks[1].kind === 'list') {
			expect(blocks[1].items[0].runs[0]).toMatchObject({
				bold: true,
				italic: true,
				text: 'Urgent'
			});
		}
	});
});

describe('shouldShowBusyNotice', () => {
	it('shows only on actual LLM fallback', () => {
		expect(shouldShowBusyNotice({ aiFallback: true, aiUsed: false, sources: [{ id: '1' }] })).toBe(
			true
		);
		expect(shouldShowBusyNotice({ aiFallback: false, aiUsed: false, sources: [] })).toBe(false);
		expect(shouldShowBusyNotice({ aiFallback: false, aiUsed: false, sources: [{ id: '1' }] })).toBe(
			false
		);
		expect(shouldShowBusyNotice({ aiFallback: false, aiUsed: true, sources: [{ id: '1' }] })).toBe(
			false
		);
	});

	it('falls back safely for older payloads lacking aiFallback', () => {
		expect(shouldShowBusyNotice({ aiUsed: false, sources: [] })).toBe(false);
		expect(shouldShowBusyNotice({ aiUsed: false, sources: [{ id: '1' }] })).toBe(true);
		expect(shouldShowBusyNotice({ aiUsed: true, sources: [{ id: '1' }] })).toBe(false);
		expect(shouldShowBusyNotice({})).toBe(false);
	});
});

describe('visibleSources', () => {
	const sixSources = [
		{ number: 1, id: '1', name: 'Frankie’s Friends Charitable Pet Foundation' },
		{ number: 2, id: '2', name: 'The Onyx & Breezy Foundation' },
		{ number: 3, id: '3', name: 'RedRover Relief Urgent Care Grant' },
		{ number: 4, id: '4', name: 'Animal Resources of Tidewater — Medical Assistance Program' },
		{ number: 5, id: '5', name: 'Paws In Need, VA Inc. — Emergency Medical Fund' },
		{ number: 6, id: '6', name: 'The Mosby Foundation' }
	];

	it('limits cards to the sources cited in the reply', () => {
		const reply = [
			'1. **Frankie’s Friends Charitable Pet Foundation** – Specialty care. [1]',
			'2. **Animal Resources of Tidewater – Medical Assistance Program** – Local help. [4]',
			'3. **Paws In Need, VA Inc. – Emergency Medical Fund** – Emergency care. [5]'
		].join('\n');

		expect(visibleSources(reply, sixSources).map((s) => s.number)).toEqual([1, 4, 5]);
	});

	it('matches shortened organization names when [n] brackets are omitted', () => {
		const reply =
			'Look at **Animal Resources of Tidewater**, **Paws In Need**, and **RedRover** for urgent surgery.';
		expect(visibleSources(reply, sixSources).map((s) => s.number)).toEqual([3, 4, 5]);
	});

	it('does not falsely match unrelated words or partial org names', () => {
		const sources = [
			{ number: 1, id: 'w', name: 'Waggle' },
			{ number: 2, id: 'p', name: 'The Pet Fund' },
			{ number: 3, id: 'r', name: 'RedRover Relief Urgent Care Grant' }
		];
		const reply =
			"I don't have “Golden Pet Rescue Fund” in our directory; the dog waggled its tail. Try [3].";
		expect(visibleSources(reply, sources).map((s) => s.number)).toEqual([3]);
	});

	it('falls back to all sources when the reply mentions none by number or name', () => {
		const reply = 'Please review the verified programs below and check each site for rules.';
		expect(visibleSources(reply, sixSources).map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6]);
		expect(visibleSources(reply, undefined)).toEqual([]);
		expect(visibleSources(reply, [])).toEqual([]);
	});
});
