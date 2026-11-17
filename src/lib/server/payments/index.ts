/**
 * Payment provider seam.
 *
 * Donation routes call `getPaymentProvider().charge(...)` and never know which
 * provider is behind it. Today that is the simulated provider: no card data is
 * collected and no money moves. TTL-313 adds a Stripe test-mode provider and
 * switches `getPaymentProvider` to return it (e.g. on STRIPE_SECRET_KEY); the
 * donate action does not change.
 */
import { randomUUID } from 'node:crypto';
import type { DonationProvider } from '$lib/server/db/enums';

export interface ChargeRequest {
	amountCents: number;
	currency: string;
	/** Same key => same providerRef, so a double-submitted form records one donation. */
	idempotencyKey?: string;
}

export interface ChargeResult {
	/** PENDING lets a webhook complete it later (Stripe); simulated is instant. */
	status: 'COMPLETED' | 'PENDING';
	provider: DonationProvider;
	providerRef: string;
}

export interface PaymentProvider {
	readonly name: DonationProvider;
	charge(request: ChargeRequest): Promise<ChargeResult>;
}

export const simulatedProvider: PaymentProvider = {
	name: 'SIMULATED',
	async charge({ idempotencyKey }) {
		return {
			status: 'COMPLETED',
			provider: 'SIMULATED',
			providerRef: `sim_${idempotencyKey ?? randomUUID()}`
		};
	}
};

export function getPaymentProvider(): PaymentProvider {
	// TTL-313: return the Stripe provider here when it is configured.
	return simulatedProvider;
}

/** Accepts only opaque tokens we generate ourselves. */
export function parseIdempotencyKey(value: FormDataEntryValue | null): string | undefined {
	const key = String(value ?? '').trim();
	return /^[A-Za-z0-9-]{16,64}$/.test(key) ? key : undefined;
}
