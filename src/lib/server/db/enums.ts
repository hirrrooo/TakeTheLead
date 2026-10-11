/**
 * SQLite has no native enums, so the schema stores these as Strings.
 * These unions are the single source of truth for allowed values.
 * Keep in sync with the /// doc comments in prisma/schema.prisma.
 */

export const CAMPAIGN_STATUS = [
	'DRAFT',
	'PENDING_REVIEW',
	'APPROVED',
	'REJECTED',
	'CLOSED',
	'ARCHIVED'
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUS)[number];

export const VISIBILITY = ['PUBLIC', 'UNLISTED', 'PRIVATE'] as const;
export type Visibility = (typeof VISIBILITY)[number];

export const MEMBER_ROLE = ['OWNER', 'MANAGER', 'VIEWER'] as const;
export type MemberRole = (typeof MEMBER_ROLE)[number];

export const MEMBER_STATUS = ['PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED'] as const;
export type MemberStatus = (typeof MEMBER_STATUS)[number];

export const CAMPAIGN_PET_ROLE = ['PRIMARY', 'SECONDARY'] as const;
export type CampaignPetRole = (typeof CAMPAIGN_PET_ROLE)[number];

export const DONATION_STATUS = [
	'PENDING',
	'COMPLETED',
	'FAILED',
	'REFUNDED',
	'DISPUTED',
	'CANCELLED'
] as const;
export type DonationStatus = (typeof DONATION_STATUS)[number];

export const DONATION_PROVIDER = [
	'MANUAL',
	'SIMULATED',
	'STRIPE',
	'PAYPAL',
	'CASH',
	'CHECK'
] as const;
export type DonationProvider = (typeof DONATION_PROVIDER)[number];

export const VET_RECORD_KIND = ['ESTIMATE', 'INVOICE', 'RECEIPT', 'RECORD'] as const;
export type VetRecordKind = (typeof VET_RECORD_KIND)[number];

export const REVIEW_DECISION = ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] as const;
export type ReviewDecision = (typeof REVIEW_DECISION)[number];

/** Typical cost tier shown to owners on a VetHospital listing. */
export const PRICE_TIER = ['LOW', 'MODERATE', 'HIGH'] as const;
export type PriceTier = (typeof PRICE_TIER)[number];

/** What kind of help a FundingSource provides. */
export const FUNDING_CATEGORY = [
	'GRANT',
	'CHARITY',
	'LOW_COST_CARE',
	'PAYMENT_PLAN',
	'CREDIT',
	'INSURANCE',
	'SHELTER_PROGRAM'
] as const;
export type FundingCategory = (typeof FUNDING_CATEGORY)[number];

export const FUNDING_SCOPE = ['NATIONAL', 'VIRGINIA', 'HAMPTON_ROADS'] as const;
export type FundingScope = (typeof FUNDING_SCOPE)[number];
