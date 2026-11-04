// Nearest vet hospitals for a Hampton Roads ZIP, for the chatbot to show an owner:
//   1. look up the ZIP's centre point (no guessing for ZIPs outside the area)
//   2. measure the straight-line distance to every listed hospital
//   3. return the nearest ER, the nearest 24/7 hospital if that ER is not 24/7,
//      and the nearest general hospitals
import { HAMPTON_ROADS_ZIPS } from '../hampton-roads-zips';

/** The VetHospital columns this feature reads (a subset of prisma/schema.prisma). */
export type HospitalRow = {
	id: string;
	name: string;
	addressLine: string | null;
	city: string | null;
	state: string | null;
	postalCode: string | null;
	phone: string | null;
	website: string | null;
	is24Hour: boolean;
	isEmergency: boolean;
	emergencyHours: string | null;
	priceTier: string; // LOW | MODERATE | HIGH
	latitude: number | null;
	longitude: number | null;
};

/** Minimal shape of the Prisma client we need, so tests can pass a fake. */
export type HospitalDb = {
	vetHospital: { findMany(args: { where: object }): Promise<HospitalRow[]> };
};

export type NearbyHospital = {
	id: string;
	name: string;
	address: string | null;
	phone: string | null;
	website: string | null;
	isEmergency: boolean;
	is24Hour: boolean;
	/** Shown instead of an "open now" claim when an ER is not open around the clock. */
	emergencyHours: string | null;
	priceTier: string;
	distanceMiles: number;
};

export type NearestHospitals =
	| {
			found: true;
			zip: string;
			er: NearbyHospital | null;
			/** Only set when the nearest ER is not 24/7, so an owner at 2am has somewhere open. */
			open24: NearbyHospital | null;
			general: NearbyHospital[];
	  }
	| { found: false; zip: string; reason: 'invalid_zip' | 'outside_area' };

/** Straight-line distance in miles between two [latitude, longitude] points. */
export function milesBetween(a: readonly [number, number], b: readonly [number, number]): number {
	const rad = (d: number) => (d * Math.PI) / 180;
	const h =
		Math.sin(rad(b[0] - a[0]) / 2) ** 2 +
		Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
	return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

function toNearby(r: HospitalRow, miles: number): NearbyHospital {
	const address = [r.addressLine, r.city, [r.state, r.postalCode].filter(Boolean).join(' ')]
		.filter(Boolean)
		.join(', ');
	return {
		id: r.id,
		name: r.name,
		address: address || null,
		phone: r.phone,
		website: r.website,
		isEmergency: r.isEmergency,
		is24Hour: r.is24Hour,
		emergencyHours: r.emergencyHours,
		priceTier: r.priceTier,
		distanceMiles: Math.round(miles * 10) / 10
	};
}

export async function findNearestHospitals(
	db: HospitalDb,
	zip: string,
	generalCount = 3
): Promise<NearestHospitals> {
	const clean = zip.trim();
	if (!/^\d{5}$/.test(clean)) return { found: false, zip: clean, reason: 'invalid_zip' };
	const origin = HAMPTON_ROADS_ZIPS[clean];
	if (!origin) return { found: false, zip: clean, reason: 'outside_area' };

	const rows = await db.vetHospital.findMany({
		where: { deletedAt: null, latitude: { not: null }, longitude: { not: null } }
	});
	const byDistance = rows
		.filter((r) => r.latitude != null && r.longitude != null)
		.map((r) => ({ r, miles: milesBetween(origin, [r.latitude!, r.longitude!]) }))
		.sort((a, b) => a.miles - b.miles || a.r.name.localeCompare(b.r.name))
		.map(({ r, miles }) => toNearby(r, miles));

	const er = byDistance.find((h) => h.isEmergency) ?? null;
	return {
		found: true,
		zip: clean,
		er,
		open24: er?.is24Hour ? null : (byDistance.find((h) => h.is24Hour) ?? null),
		general: byDistance.filter((h) => !h.isEmergency).slice(0, generalCount)
	};
}
