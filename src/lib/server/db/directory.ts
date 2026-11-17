/**
 * Server-only reads for the public directory surfaces: the veterinary hospital
 * lookup (TTL-206) and the funding-source directory (TTL-308).
 *
 * These queries live here rather than inside a route so the browse/search pages
 * and the developer bench share one definition of "nearest hospitals first" and
 * "only live, non-retired sources". Change the ordering or the visibility rules
 * once and every surface agrees.
 */
import { db } from '$lib/server/db';

export interface VetHospitalSearch {
	/** Matched as a ZIP prefix, e.g. "234" finds every 23xxx listing. */
	zip?: string;
	/** Substring of the comma-separated speciesServed field, e.g. "Cats". */
	species?: string;
	limit?: number;
}

/**
 * Hospitals by ZIP prefix and species, always-open first, then emergency, then
 * name — the ranking TTL-206 promises to an owner searching at 2am.
 */
export async function searchVetHospitals({ zip, species, limit = 20 }: VetHospitalSearch = {}) {
	return db.vetHospital.findMany({
		where: {
			deletedAt: null,
			...(zip ? { postalCode: { startsWith: zip } } : {}),
			...(species ? { speciesServed: { contains: species } } : {})
		},
		orderBy: [{ is24Hour: 'desc' }, { isEmergency: 'desc' }, { name: 'asc' }],
		take: limit
	});
}

export interface FundingSourceFilter {
	/** NATIONAL | VIRGINIA | HAMPTON_ROADS */
	scope?: string;
	limit?: number;
}

/**
 * Live funding sources, optionally narrowed to one scope. Retired sources stay
 * hidden: they are kept only for history (TTL-308).
 */
export async function listLiveFundingSources({ scope, limit = 30 }: FundingSourceFilter = {}) {
	return db.fundingSource.findMany({
		where: { retiredAt: null, ...(scope ? { scope } : {}) },
		orderBy: [{ scope: 'asc' }, { name: 'asc' }],
		take: limit
	});
}
