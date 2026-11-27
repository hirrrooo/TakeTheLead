import { describe, expect, it } from 'vitest';
import { parseChatBlocks, parseInlineRuns, shouldShowBusyNotice } from './format';

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
