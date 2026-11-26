// Run:  npx tsx --test tests/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	findNearestHospitals,
	milesBetween,
	type HospitalDb,
	type HospitalRow
} from '../src/lib/server/db/nearest-hospitals';

const hospital = (
	p: Partial<HospitalRow> & { id: string; latitude: number | null; longitude: number | null }
): HospitalRow => ({
	name: p.id,
	addressLine: null,
	city: 'Norfolk',
	state: 'VA',
	postalCode: '23510',
	phone: '(757) 555-0100',
	website: null,
	is24Hour: false,
	isEmergency: false,
	emergencyHours: null,
	priceTier: 'MODERATE',
	...p
});

// Distances from ZIP 23510 (downtown Norfolk, about 36.85, -76.29).
const rows: HospitalRow[] = [
	hospital({ id: 'er-near', isEmergency: true, latitude: 36.86, longitude: -76.27 }),
	hospital({
		id: 'er-24-far',
		isEmergency: true,
		is24Hour: true,
		latitude: 36.74,
		longitude: -76.04
	}),
	hospital({ id: 'gp-1', latitude: 36.851, longitude: -76.29 }),
	hospital({ id: 'gp-2', latitude: 36.87, longitude: -76.3 }),
	hospital({ id: 'gp-3', priceTier: 'LOW', latitude: 36.9, longitude: -76.25 }),
	hospital({ id: 'gp-far', latitude: 37.2, longitude: -76.7 }),
	hospital({ id: 'no-location', latitude: null, longitude: null })
];

function fakeDb(data: HospitalRow[]) {
	const calls: { where: object }[] = [];
	const db: HospitalDb = {
		vetHospital: {
			findMany: async (args) => {
				calls.push(args);
				return data;
			}
		}
	};
	return { db, calls };
}

test('measures straight-line miles', () => {
	assert.equal(milesBetween([36.85, -76.29], [36.85, -76.29]), 0);
	// Norfolk to Williamsburg is about 38 miles as the crow flies.
	const miles = milesBetween([36.8508, -76.2859], [37.2707, -76.7075]);
	assert.ok(miles > 35 && miles < 41, `got ${miles}`);
});

test('rejects ZIPs that are not 5 digits, without querying', async () => {
	const { db, calls } = fakeDb(rows);
	for (const zip of ['', '2351', '235100', 'abcde']) {
		assert.deepEqual(await findNearestHospitals(db, zip), {
			found: false,
			zip,
			reason: 'invalid_zip'
		});
	}
	assert.equal(calls.length, 0);
});

test('says when a ZIP is outside Hampton Roads instead of guessing', async () => {
	const { db } = fakeDb(rows);
	assert.deepEqual(await findNearestHospitals(db, '90210'), {
		found: false,
		zip: '90210',
		reason: 'outside_area'
	});
});

test('returns the nearest ER and the three nearest general hospitals', async () => {
	const { db, calls } = fakeDb(rows);
	const result = await findNearestHospitals(db, ' 23510 ');
	assert.ok(result.found);
	assert.equal(result.zip, '23510');
	assert.equal(result.er?.id, 'er-near');
	assert.deepEqual(
		result.general.map((h) => h.id),
		['gp-1', 'gp-2', 'gp-3']
	);
	assert.ok(result.general.every((h) => !h.isEmergency));
	assert.deepEqual(calls[0].where, {
		deletedAt: null,
		latitude: { not: null },
		longitude: { not: null }
	});
});

test('adds the nearest 24/7 hospital only when the nearest ER is not 24/7', async () => {
	const near = await findNearestHospitals(fakeDb(rows).db, '23510');
	assert.ok(near.found);
	assert.equal(near.open24?.id, 'er-24-far');

	const only24 = rows.filter((r) => r.id !== 'er-near');
	const result = await findNearestHospitals(fakeDb(only24).db, '23510');
	assert.ok(result.found);
	assert.equal(result.er?.id, 'er-24-far');
	assert.equal(result.open24, null);
});

test('includes phone, ER and 24/7 flags, price tier and rounded distance', async () => {
	const result = await findNearestHospitals(fakeDb(rows).db, '23510');
	assert.ok(result.found);
	const gp = result.general.find((h) => h.id === 'gp-3');
	assert.equal(gp?.phone, '(757) 555-0100');
	assert.equal(gp?.priceTier, 'LOW');
	assert.equal(gp?.isEmergency, false);
	assert.equal(gp?.is24Hour, false);
	assert.equal(gp?.address, 'Norfolk, VA 23510');
	assert.match(String(gp?.distanceMiles), /^\d+(\.\d)?$/);
});

test('skips hospitals without a location and still answers when none are listed', async () => {
	const result = await findNearestHospitals(fakeDb([rows[6]]).db, '23510');
	assert.deepEqual(result, { found: true, zip: '23510', er: null, open24: null, general: [] });
});
