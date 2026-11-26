import { describe, expect, it } from 'vitest';
import {
	extractFirstName,
	formatPublicOwnerLabel,
	looksLikeStreetAddress,
	projectPublicOwner,
	sanitizePublicCity
} from './owner-privacy';

describe('extractFirstName', () => {
	it('returns only the first name token from a full name', () => {
		expect(extractFirstName('Maria Alvarez')).toBe('Maria');
		expect(extractFirstName('  Pat   Nguyen  ')).toBe('Pat');
		expect(extractFirstName('Mary-Jane Parker')).toBe('Mary-Jane');
		expect(extractFirstName('Cher')).toBe('Cher');
	});

	it('returns null for empty input or email-like values', () => {
		expect(extractFirstName(null)).toBeNull();
		expect(extractFirstName(undefined)).toBeNull();
		expect(extractFirstName('   ')).toBeNull();
		expect(extractFirstName('maria@example.com')).toBeNull();
	});
});

describe('looksLikeStreetAddress', () => {
	it('flags street numbers, PO boxes, ZIP codes, and emails', () => {
		expect(looksLikeStreetAddress('123 Main St')).toBe(true);
		expect(looksLikeStreetAddress('6095 Indian River Road, Suite 200')).toBe(true);
		expect(looksLikeStreetAddress('PO Box 142')).toBe(true);
		expect(looksLikeStreetAddress('P.O. Box 99')).toBe(true);
		expect(looksLikeStreetAddress('Norfolk, VA 23510')).toBe(true);
		expect(looksLikeStreetAddress('Unit 101, 2476 Nimmo Pkwy')).toBe(true);
		expect(looksLikeStreetAddress('Main Street')).toBe(true);
		expect(looksLikeStreetAddress('Apt 4')).toBe(true);
		expect(looksLikeStreetAddress('maria@example.com')).toBe(true);
	});

	it('allows legitimate city names including multi-word and Saint names', () => {
		expect(looksLikeStreetAddress('Virginia Beach')).toBe(false);
		expect(looksLikeStreetAddress('Newport News')).toBe(false);
		expect(looksLikeStreetAddress('Norfolk')).toBe(false);
		expect(looksLikeStreetAddress('St. Louis')).toBe(false);
		expect(looksLikeStreetAddress('Port St. Lucie')).toBe(false);
	});
});

describe('sanitizePublicCity', () => {
	it('keeps clean city names and strips trailing state abbreviations', () => {
		expect(sanitizePublicCity('Virginia Beach')).toBe('Virginia Beach');
		expect(sanitizePublicCity('  Norfolk  ')).toBe('Norfolk');
		expect(sanitizePublicCity('Norfolk, VA')).toBe('Norfolk');
	});

	it('never passes through addresses, ZIP codes, or emails', () => {
		expect(sanitizePublicCity('123 Main St')).toBeNull();
		expect(sanitizePublicCity('123 Main St, Norfolk')).toBeNull();
		expect(sanitizePublicCity('123 Main Street, Virginia Beach, VA 23456')).toBeNull();
		expect(sanitizePublicCity('Norfolk, VA 23510')).toBeNull();
		expect(sanitizePublicCity('PO Box 42')).toBeNull();
		expect(sanitizePublicCity('owner@example.com')).toBeNull();
		expect(sanitizePublicCity('')).toBeNull();
		expect(sanitizePublicCity(null)).toBeNull();
	});
});

describe('projectPublicOwner', () => {
	it('projects first name and hospital city fallback when ownerCity is absent', () => {
		expect(
			projectPublicOwner({
				ownerName: 'Maria Alvarez',
				isOwnerAnonymous: false,
				ownerDisplayName: null,
				ownerCity: null,
				hospitalCity: 'Virginia Beach'
			})
		).toEqual({
			ownerName: 'Maria',
			ownerCity: 'Virginia Beach'
		});
	});

	it('prefers sanitized ownerCity over hospitalCity and ignores street-address inputs', () => {
		expect(
			projectPublicOwner({
				ownerName: 'Pat Nguyen',
				isOwnerAnonymous: false,
				ownerCity: 'Norfolk',
				hospitalCity: 'Chesapeake'
			})
		).toEqual({
			ownerName: 'Pat',
			ownerCity: 'Norfolk'
		});

		expect(
			projectPublicOwner({
				ownerName: 'Pat Nguyen',
				isOwnerAnonymous: false,
				ownerCity: '123 Oak St',
				hospitalCity: 'Chesapeake'
			})
		).toEqual({
			ownerName: 'Pat',
			ownerCity: 'Chesapeake'
		});
	});

	it('respects anonymous owners without leaking even the first name', () => {
		expect(
			projectPublicOwner({
				ownerName: 'Maria Alvarez',
				isOwnerAnonymous: true,
				ownerDisplayName: 'Whiskers’ Family',
				hospitalCity: 'Virginia Beach'
			})
		).toEqual({
			ownerName: 'Whiskers’ Family',
			ownerCity: 'Virginia Beach'
		});

		expect(
			projectPublicOwner({
				ownerName: 'Maria Alvarez',
				isOwnerAnonymous: true,
				ownerDisplayName: null,
				hospitalCity: null
			})
		).toEqual({
			ownerName: 'Anonymous',
			ownerCity: null
		});

		expect(
			projectPublicOwner({
				ownerName: 'Maria Alvarez',
				isOwnerAnonymous: true,
				ownerDisplayName: 'secret@example.com',
				hospitalCity: '123 Main St'
			})
		).toEqual({
			ownerName: 'Anonymous',
			ownerCity: null
		});
	});

	it('falls back cleanly when ownerName is missing', () => {
		expect(
			projectPublicOwner({
				ownerName: null,
				isOwnerAnonymous: false,
				ownerCity: 'Suffolk'
			})
		).toEqual({
			ownerName: 'A Take the Lead member',
			ownerCity: 'Suffolk'
		});
	});

	it('formats public owner labels with city only when available', () => {
		expect(formatPublicOwnerLabel({ ownerName: 'Maria', ownerCity: 'Virginia Beach' })).toBe(
			'Maria · Virginia Beach'
		);
		expect(formatPublicOwnerLabel({ ownerName: 'Maria', ownerCity: null })).toBe('Maria');
	});
});
