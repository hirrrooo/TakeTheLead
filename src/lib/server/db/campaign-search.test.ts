import { describe, expect, it } from 'vitest';
import {
	MAX_SEARCH_LENGTH,
	MAX_SEARCH_TERMS,
	normalizeSearchQuery,
	searchTerms
} from './campaign-search';

describe('normalizeSearchQuery', () => {
	it('returns an empty string for missing input', () => {
		expect(normalizeSearchQuery(null)).toBe('');
		expect(normalizeSearchQuery(undefined)).toBe('');
		expect(normalizeSearchQuery('   ')).toBe('');
	});

	it('trims and collapses whitespace', () => {
		expect(normalizeSearchQuery('  bella   surgery \n')).toBe('bella surgery');
	});

	it('removes LIKE wildcards and backslashes', () => {
		expect(normalizeSearchQuery('100%')).toBe('100');
		expect(normalizeSearchQuery('%')).toBe('');
		expect(normalizeSearchQuery('_')).toBe('');
		expect(normalizeSearchQuery('a\\b')).toBe('a b');
	});

	it('caps the length', () => {
		expect(normalizeSearchQuery('x'.repeat(500))).toHaveLength(MAX_SEARCH_LENGTH);
	});
});

describe('searchTerms', () => {
	it('splits into words and drops duplicates', () => {
		expect(searchTerms('Bella bella surgery')).toEqual(['Bella', 'bella', 'surgery']);
		expect(searchTerms('')).toEqual([]);
	});

	it('limits the number of words', () => {
		expect(searchTerms('a b c d e f g h')).toHaveLength(MAX_SEARCH_TERMS);
	});
});
