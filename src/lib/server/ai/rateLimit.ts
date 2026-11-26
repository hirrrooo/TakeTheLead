// Simple in-memory limiter: N requests per window per key (IP). Good enough for one Node process.
const hits = new Map<string, number[]>();
export function allow(key: string, limit = 20, windowMs = 10 * 60_000): boolean {
	const now = Date.now();
	const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
	if (recent.length >= limit) {
		hits.set(key, recent);
		return false;
	}
	recent.push(now);
	hits.set(key, recent);
	return true;
}
