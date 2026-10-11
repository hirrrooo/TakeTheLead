/**
 * TakeTheLead starter data (TTL-208).
 *
 * Everything here is DEMO data for templating and testing. Ids are fixed and
 * prefixed `seed_` so the seed is idempotent and so `export-seed-sql.mjs` can
 * tell demo rows apart from a developer's scratch rows.
 *
 * Provenance
 * ----------
 * Hampton Roads hospitals and the funding sources were researched and verified
 * on 2026-10-10 against each organisation's own website, with every ZIP checked
 * against the US Census geocoder. `verifiedAt` / `lastCheckedAt` record that
 * check; `verifyNote` carries the caveat a reader needs. Links go stale —
 * re-run `npm run db:check-links` before each release and refresh the dates.
 *
 * Do NOT add a funding source or hospital without loading its URL first.
 * Several widely-recommended pet funds are permanently closed (Brown Dog
 * Foundation, Magic Bullet Fund, Zeus Oncology Fund) while their domains still
 * resolve, so a link that loads is not proof a program is alive.
 */
import type {
	DonationProvider,
	DonationStatus,
	FundingCategory,
	FundingScope,
	MemberRole,
	MemberStatus,
	PriceTier,
	ReviewDecision,
	VetRecordKind
} from '../src/lib/server/db/enums';

/** The date every row in this file was last hand-checked. */
export const CHECKED_AT = new Date('2026-10-10T15:00:00Z');

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface SeedUser {
	id: string;
	name: string;
	email: string;
	isSystem: boolean;
	isModerator: boolean;
}

/** Shared password for every loginable demo account. */
export const SEED_PASSWORD = 'password123!';

export const seedUsers: SeedUser[] = [
	{ id: 'system', name: 'TakeTheLead System', email: 'system@takethelead.dev', isSystem: true, isModerator: false },
	{ id: 'seed_maria', name: 'Maria Alvarez', email: 'seed_maria@takethelead.dev', isSystem: false, isModerator: false },
	{ id: 'seed_james', name: 'James Alvarez', email: 'seed_james@takethelead.dev', isSystem: false, isModerator: false },
	{ id: 'seed_pat', name: 'Pat Nguyen', email: 'seed_pat@takethelead.dev', isSystem: false, isModerator: false },
	{ id: 'seed_mod', name: 'Dana Whitfield', email: 'seed_mod@takethelead.dev', isSystem: false, isModerator: true }
];

// ---------------------------------------------------------------------------
// Vet hospitals — Hampton Roads, VA
// ---------------------------------------------------------------------------

export interface SeedHospital {
	id: string;
	name: string;
	addressLine: string;
	city: string;
	state: string;
	postalCode: string;
	phone: string;
	website: string | null;
	is24Hour: boolean;
	isEmergency: boolean;
	isLowCost: boolean;
	priceTier: PriceTier;
	emergencyHours: string | null;
	speciesServed: string;
	services: string | null;
	notes: string | null;
	isVerified: boolean;
	latitude: number | null;
	longitude: number | null;
	createdById: string;
}

/**
 * 12 hospitals: 4 emergency/specialty, 5 general practice, 3 low-cost nonprofit.
 *
 * Only Bay Beach is genuinely open 24/7. The other emergency hospitals have
 * real closure windows, which `emergencyHours` records — a pet owner who turns
 * up at 2am on a Tuesday needs to know that before driving across the bridge.
 */
export const seedHospitals: SeedHospital[] = [
	// ---- Emergency / specialty ----
	{
		id: 'seed_hosp_baybeach',
		name: 'Bay Beach Veterinary Emergency Hospital',
		addressLine: '2476 Nimmo Pkwy, Unit 101',
		city: 'Virginia Beach',
		state: 'VA',
		postalCode: '23456',
		phone: '(757) 427-3214',
		website: 'https://baybeachemergencyvet.com/',
		is24Hour: true,
		isEmergency: true,
		isLowCost: false,
		priceTier: 'HIGH',
		emergencyHours: 'Open 24/7, including holidays',
		speciesServed: 'Dogs, Cats',
		services: 'Emergency, critical care, surgery, imaging',
		notes: 'The region\u2019s only true 24/7/365 emergency hospital. After-hours primary care is the sister practice, Bay Beach Veterinary Hospital.',
		isVerified: true,
		latitude: 36.0821,
		longitude: -76.1243,
		createdById: 'seed_mod'
	},
	{
		id: 'seed_hosp_vest',
		name: 'Veterinary Emergency & Specialty of Tidewater',
		addressLine: '6095 Indian River Road, Suite 200',
		city: 'Virginia Beach',
		state: 'VA',
		postalCode: '23464',
		phone: '(757) 841-8378',
		website: 'https://vestvets.com/',
		is24Hour: false,
		isEmergency: true,
		isLowCost: false,
		priceTier: 'HIGH',
		emergencyHours: 'Continuous from Fri 7AM to Wed 6PM; closed to new cases mid-week',
		speciesServed: 'Dogs, Cats',
		services: 'CT, ultrasound, endoscopy, board-certified critical care',
		notes: 'Specialty and referral hospital. Not open around the clock every day \u2014 check hours before an overnight visit.',
		isVerified: true,
		latitude: 36.8064,
		longitude: -76.1236,
		createdById: 'seed_mod'
	},
	{
		id: 'seed_hosp_cove',
		name: 'The COVE \u2014 Center of Veterinary Expertise',
		addressLine: '6550 Hampton Roads Pkwy, Suite 113',
		city: 'Suffolk',
		state: 'VA',
		postalCode: '23435',
		phone: '(757) 935-9111',
		website: 'https://thecovevets.com/',
		is24Hour: false,
		isEmergency: true,
		isLowCost: false,
		priceTier: 'HIGH',
		emergencyHours: 'Mon\u2013Thu 7AM\u201310PM, Fri 10AM\u201310PM; closed Sat and Sun',
		speciesServed: 'Dogs, Cats',
		services: 'Cardiology, surgery, critical care, overnight hospitalization',
		notes: 'Referral specialty centre. Weekend emergencies go to Bay Beach instead.',
		isVerified: true,
		latitude: 36.7247,
		longitude: -76.5422,
		createdById: 'seed_mod'
	},
	{
		id: 'seed_hosp_care',
		name: 'Coastal Animal Referral Emergency (CARE)',
		addressLine: '5295 John Tyler Hwy',
		city: 'Williamsburg',
		state: 'VA',
		postalCode: '23185',
		phone: '(757) 703-0199',
		website: 'https://www.care199.com/',
		is24Hour: false,
		isEmergency: true,
		isLowCost: false,
		priceTier: 'HIGH',
		emergencyHours: 'Opens Fri 7:30AM, 24 hours Sat/Sun, closes Mon 9PM; closed Tue\u2013Thu',
		speciesServed: 'Dogs, Cats',
		services: 'Emergency surgery, hyperbaric oxygen, hemoperfusion',
		notes: 'Serves the Historic Triangle. Call ahead \u2014 the closure window is long.',
		isVerified: true,
		latitude: 37.2266,
		longitude: -76.7127,
		createdById: 'seed_mod'
	},

	// ---- General practice ----
	{
		id: 'seed_hosp_chesapeake',
		name: 'Chesapeake Animal Hospital',
		addressLine: '713 Greenbrier Pkwy',
		city: 'Chesapeake',
		state: 'VA',
		postalCode: '23320',
		phone: '(757) 547-5100',
		website: 'https://www.chesapeakeanimalhospital.com/',
		is24Hour: false,
		isEmergency: false,
		isLowCost: false,
		priceTier: 'MODERATE',
		emergencyHours: null,
		speciesServed: 'Dogs, Cats',
		services: 'Wellness, surgery, dentistry, urgent care, grooming',
		notes: 'Full-service family practice since 1986. Mon\u2013Fri 8AM\u20135/6PM, Sat 8AM\u201312PM, closed Sunday.',
		isVerified: true,
		latitude: 36.7228,
		longitude: -76.2297,
		createdById: 'seed_maria'
	},
	{
		id: 'seed_hosp_dogandcat',
		name: 'Dog & Cat Hospital',
		addressLine: '238 W 21st St',
		city: 'Norfolk',
		state: 'VA',
		postalCode: '23517',
		phone: '(757) 622-1788',
		website: 'https://www.dogandcathospitalnorfolk.com/',
		is24Hour: false,
		isEmergency: false,
		isLowCost: false,
		priceTier: 'MODERATE',
		emergencyHours: null,
		speciesServed: 'Dogs, Cats',
		services: 'In-hours urgent care, stabilization, hospitalization',
		notes: 'Established 1937. Its website advertises \u201c24/7 Emergency\u201d, but the page directs overnight cases to Bay Beach, The COVE, PARC and CARE \u2014 so it is deliberately NOT flagged emergency or 24/7 here.',
		isVerified: true,
		latitude: 36.8601,
		longitude: -76.2954,
		createdById: 'seed_maria'
	},
	{
		id: 'seed_hosp_ghent',
		name: 'Ghent Veterinary Hospital',
		addressLine: '939 W 21st St',
		city: 'Norfolk',
		state: 'VA',
		postalCode: '23517',
		phone: '(757) 960-6977',
		website: 'https://www.ghentvet.com/',
		is24Hour: false,
		isEmergency: false,
		isLowCost: false,
		priceTier: 'MODERATE',
		emergencyHours: null,
		speciesServed: 'Dogs, Cats',
		services: 'Wellness, dentistry, internal medicine',
		notes: 'Neighbourhood family practice in Ghent; second location at 3415 Granby St, 23504. Closed Sunday, doctor hours by appointment.',
		isVerified: true,
		latitude: 36.8588,
		longitude: -76.2971,
		createdById: 'seed_pat'
	},
	{
		id: 'seed_hosp_midway',
		name: 'Midway Veterinary Hospital',
		addressLine: '3710 Indian River Rd',
		city: 'Chesapeake',
		state: 'VA',
		postalCode: '23325',
		phone: '(757) 366-4050',
		website: 'https://www.midwayvethospital.com/',
		is24Hour: false,
		isEmergency: false,
		isLowCost: false,
		priceTier: 'MODERATE',
		emergencyHours: null,
		speciesServed: 'Dogs, Cats, Exotics',
		services: 'Wellness, exotics, surgery, travel certificates',
		notes: 'AAHA-accredited, one of the few local practices with a dedicated exotics service. Extended evening hours Mon\u2013Thu.',
		isVerified: true,
		latitude: 36.7651,
		longitude: -76.2441,
		createdById: 'seed_pat'
	},
	{
		id: 'seed_hosp_edinburgh',
		name: 'Edinburgh Animal Hospital',
		addressLine: '233 Hillcrest Pkwy, Suite 3',
		city: 'Chesapeake',
		state: 'VA',
		postalCode: '23322',
		phone: '(757) 432-0488',
		website: 'https://edinburghanimalhospital.com/',
		is24Hour: false,
		isEmergency: false,
		isLowCost: false,
		priceTier: 'MODERATE',
		emergencyHours: null,
		speciesServed: 'Dogs, Cats',
		services: 'Preventive care, digital radiology, dentistry',
		notes: 'Newer hospital in the Hickory area with separate cat and dog waiting areas.',
		isVerified: true,
		latitude: 36.6747,
		longitude: -76.2712,
		createdById: 'seed_maria'
	},

	// ---- Low-cost / nonprofit ----
	{
		id: 'seed_hosp_chs_clinic',
		name: 'Chesapeake Humane Society Veterinary Clinic',
		addressLine: '312 N Battlefield Blvd',
		city: 'Chesapeake',
		state: 'VA',
		postalCode: '23320',
		phone: '(757) 546-5355',
		website: 'https://www.chesapeakehumane.org/clinic',
		is24Hour: false,
		isEmergency: false,
		isLowCost: true,
		priceTier: 'LOW',
		emergencyHours: null,
		speciesServed: 'Dogs, Cats',
		services: 'Vaccines, wellness exams, dentistry (income-qualified), spay/neuter',
		notes: 'Walk-in vaccine clinic has no income requirement. Illness and dental exams are income-qualified and need a $30 deposit. Explicitly not an emergency facility.',
		isVerified: true,
		latitude: 36.7702,
		longitude: -76.2371,
		createdById: 'seed_mod'
	},
	{
		id: 'seed_hosp_norfolkspca',
		name: 'Norfolk SPCA Community Spay Neuter Clinic',
		addressLine: '2364 E Little Creek Rd',
		city: 'Norfolk',
		state: 'VA',
		postalCode: '23518',
		phone: '(757) 383-6620',
		website: 'https://norfolkspca.com/community-spay-neuter-clinic/',
		is24Hour: false,
		isEmergency: false,
		isLowCost: true,
		priceTier: 'LOW',
		emergencyHours: null,
		speciesServed: 'Dogs, Cats, feral cats',
		services: 'High-volume spay/neuter, vaccines, wellness exams, preventives',
		notes: 'Nonprofit high-volume clinic (13,000+ animals a year). Main adoption centre is 916 Ballentine Blvd, 23504, (757) 622-3319.',
		isVerified: true,
		latitude: 36.8916,
		longitude: -76.2519,
		createdById: 'seed_mod'
	},
	{
		id: 'seed_hosp_vbspca',
		name: 'VBSPCA Clinic',
		addressLine: '3040 Holland Rd',
		city: 'Virginia Beach',
		state: 'VA',
		postalCode: '23453',
		phone: '(757) 427-0071',
		website: 'https://vbspca.com/clinic/',
		is24Hour: false,
		isEmergency: false,
		isLowCost: true,
		priceTier: 'LOW',
		emergencyHours: null,
		speciesServed: 'Dogs, Cats',
		services: 'Wellness, vaccines, dentistry, orthopedics, spay/neuter, heartworm treatment',
		notes: 'Income-capped (households under $65,000) plus all military, reservists, families and first responders. Wellness clinic and spay/neuter are open to every income.',
		isVerified: true,
		latitude: 36.8135,
		longitude: -76.0553,
		createdById: 'seed_mod'
	}
];

// ---------------------------------------------------------------------------
// Funding sources — 11 starter + 4 added
// ---------------------------------------------------------------------------

export interface SeedFundingSource {
	id: string;
	name: string;
	url: string;
	category: FundingCategory;
	scope: FundingScope;
	species: string;
	conditions: string;
	eligibility: string;
	howToApply: string;
	maxAwardCents: number | null;
	maxAwardNote: string;
	recurring: boolean;
	incomeRestricted: boolean;
	vetMustApply: boolean;
	isVerified: boolean;
	verifyNote: string;
	notes: string | null;
	createdById: string;
}

/**
 * The 11 starter sources. All national, all with a URL that was loaded and
 * confirmed to resolve on CHECKED_AT.
 */
const starterFundingSources: SeedFundingSource[] = [
	{
		id: 'seed_fund_redrover',
		name: 'RedRover Relief Urgent Care Grant',
		url: 'https://redrover.org/relief/urgent-care-grants/',
		category: 'GRANT',
		scope: 'NATIONAL',
		species: 'Dogs, Cats (one animal per application)',
		conditions:
			'Life-threatening injury or illness needing urgent, specific treatment with a good outcome. Does not cover office exams, diagnostics, ongoing conditions, routine care, or follow-up visits.',
		eligibility:
			'Household income at or under $60,000 a year. Applicant and animal must live in the US. You need a current diagnosis, treatment plan and written cost estimate from your vet. One grant per household.',
		howToApply:
			'You apply yourself. Answer the online pre-application questions; if you are eligible you are given a link to the full application. The application closes Fridays 4pm PT and reopens Monday 9am PT. Reply takes 1\u20132 business days.',
		maxAwardCents: 50000,
		maxAwardNote: 'Typical grant is $250\u2013$300; requests of $500 or more are not eligible',
		recurring: false,
		incomeRestricted: true,
		vetMustApply: false,
		isVerified: true,
		verifyNote: 'Loaded 2026-10-10. Pre-application questions and application link both present.',
		notes: 'Small grants, but fast and realistic for a modest emergency bill.',
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_thepetfund',
		name: 'The Pet Fund',
		url: 'https://thepetfund.com/for-pet-owners/the-pet-fund-application',
		category: 'CHARITY',
		scope: 'NATIONAL',
		species: 'Dogs, Cats',
		conditions:
			'Non-basic, NON-urgent care only \u2014 specialty or advanced treatment that can wait. Will not fund emergencies. Money is paid straight to your veterinarian, never to you.',
		eligibility:
			'US pet owners who need care beyond basic treatment and cannot afford it. No published income threshold, but there is a standing wait list.',
		howToApply:
			'Email info@thepetfund.com first, describing the medical need and a phone number. Staff reply with the current wait-list length and eligibility rules; only then do you complete the online application. Applications sent before staff reply are not processed.',
		maxAwardCents: null,
		maxAwardNote: 'No published cap',
		recurring: false,
		incomeRestricted: false,
		vetMustApply: false,
		isVerified: true,
		verifyNote: 'Loaded 2026-10-10. Email-first intake step confirmed on the page.',
		notes: 'Not usable for a same-week emergency. Good for planned specialty work.',
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_paws4acure',
		name: 'Paws 4 A Cure',
		url: 'https://www.paws4acure.org/askforhelp.php',
		category: 'CHARITY',
		scope: 'NATIONAL',
		species: 'Dogs, Cats',
		conditions:
			'Urgent care for illness or injury, including medication, insulin, heartworm-positive treatment, and equipment such as wheelchairs. Excludes spay/neuter, vaccines, preventives, routine care, office visits, euthanasia, cremation, and bills already paid.',
		eligibility:
			'US pet owners who cannot afford urgent treatment. No discrimination by breed, age or diagnosis. A diagnosis and treatment plan are required, plus hardship documentation.',
		howToApply:
			'Confirm your clinic will work with nonprofits and get their email, read the guidelines, gather hardship documents, then submit the online application with them.',
		maxAwardCents: null,
		maxAwardNote: 'No published cap',
		recurring: false,
		incomeRestricted: true,
		vetMustApply: false,
		isVerified: true,
		verifyNote:
			'Loaded 2026-10-10, link resolves. CAUTION: the page said applications were temporarily closed and would be reviewed again after October 20 \u2014 re-check before pointing an owner here.',
		notes: 'Re-check intake status before recommending.',
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_helpapet',
		name: 'Help-A-Pet',
		url: 'https://www.help-a-pet.org/apply.html',
		category: 'CHARITY',
		scope: 'NATIONAL',
		species: 'All pets, through the owner\u2019s local veterinarian',
		conditions:
			'Veterinary services, medicine and medical supplies for a sick or injured pet. Paid directly to the veterinarian or supplier.',
		eligibility:
			'Strict published income test: under $20,000 a year for a single-person household or $40,000 for a family household, adjusted for dependents. Focus on disabled, senior and low-income working families. Once per pet.',
		howToApply:
			'Complete and sign the full application and mail it with your most recent federal tax return \u2014 or disability, food-stamp or medical-aid paperwork if you do not file \u2014 to Help-A-Pet, P.O. Box 244, Hinsdale, IL 60522. Only approved applicants are contacted.',
		maxAwardCents: null,
		maxAwardNote: 'No published cap',
		recurring: false,
		incomeRestricted: true,
		vetMustApply: false,
		isVerified: true,
		verifyNote: 'Loaded 2026-10-10. Income thresholds and mailing address read from the apply page.',
		notes: 'Paper application by mail \u2014 slowest option in this list.',
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_frankiesfriends',
		name: 'Frankie\u2019s Friends Charitable Pet Foundation',
		url: 'https://www.frankiesfriends.org/apply-for-assistance-3',
		category: 'GRANT',
		scope: 'NATIONAL',
		species: 'Dogs, Cats (family-owned pets)',
		conditions:
			'Lifesaving emergency and specialty care, including cancer treatment through the JLACF Fund under a veterinary oncologist.',
		eligibility:
			'The pet needs emergency or specialty care, has been examined, the vet sees a good prognosis with treatment, and you can document financial need. No reimbursement for paid bills. Cannot fund pets treated at hospitals that run their own assistance funds \u2014 Banfield, BluePearl and VCA are named.',
		howToApply:
			'Submit the online application and choose the applicable fund (National, JLACF cancer, Paw It Forward, Crucial Care). Questions: giving@frankiesfriends.org or 888-465-7387.',
		maxAwardCents: null,
		maxAwardNote: 'No published cap',
		recurring: false,
		incomeRestricted: true,
		vetMustApply: false,
		isVerified: true,
		verifyNote: 'Loaded 2026-10-10. Exclusion list for Banfield/BluePearl/VCA confirmed on the page.',
		notes: 'The hospital-exclusion rule matters when suggesting this to an owner.',
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_loveofalex',
		name: 'For The Love Of Alex',
		url: 'https://www.fortheloveofalex.org/help-my-pet',
		category: 'CHARITY',
		scope: 'NATIONAL',
		species: 'Dogs, Cats',
		conditions: 'Emergency veterinary care for low-income pet owners.',
		eligibility:
			'Low-income owners facing a pet medical emergency. Exact income thresholds and covered conditions sit on a script-rendered part of the page, so confirm them on the site.',
		howToApply:
			'You apply yourself through the online \u201cRequest Help for a Pet Emergency\u201d form. No vet submission needed.',
		maxAwardCents: null,
		maxAwardNote: 'No published cap',
		recurring: false,
		incomeRestricted: true,
		vetMustApply: false,
		isVerified: true,
		verifyNote:
			'Loaded 2026-10-10, form present. Eligibility details could not be read as text \u2014 medium confidence, confirm thresholds manually.',
		notes: null,
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_petassistance',
		name: 'Pet Assistance, Inc.',
		url: 'http://www.petassistanceinc.org/',
		category: 'CHARITY',
		scope: 'NATIONAL',
		species: 'Dogs, Cats',
		conditions:
			'Emergency vet bills. Named fundable emergencies include bladder stones, cat urinary blockage, pyometra, bloat, intestinal obstruction, dentistry, tetanus and knee surgery.',
		eligibility:
			'US owners facing an emergency bill who would otherwise surrender the pet. For CCL/TPLO knee repair they only help when the total TPLO cost is under $3,700.',
		howToApply:
			'Submit the Financial Aid / Application form on the site. Contact petassistance1973@gmail.com.',
		maxAwardCents: null,
		maxAwardNote: 'No published cap; TPLO must be under $3,700 to qualify',
		recurring: false,
		incomeRestricted: false,
		vetMustApply: false,
		isVerified: true,
		verifyNote:
			'Loaded 2026-10-10. Site banner showed a closure Oct 9\u201319, so expect periodic pauses. HTTP-only domain.',
		notes: 'Relevant to the Bella TPLO demo campaign \u2014 her quote is above their $3,700 guideline.',
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_onyxbreezy',
		name: 'The Onyx & Breezy Foundation',
		url: 'https://www.onyxandbreezy.org/grant-application.html',
		category: 'GRANT',
		scope: 'NATIONAL',
		species: 'Dogs, Cats (plus shelter and rescue programs)',
		conditions:
			'Cancer treatment and research (The Tuxie Fund), geriatric care (The Shadow Fund), spay/neuter (The Rio Fund), medicine and equipment, and pets of owners in medical hardship.',
		eligibility:
			'Grants go to 501(c)(3) rescues and shelters and to individual owners in medical hardship. Owners submit a grant application directly.',
		howToApply:
			'Use the Grant Application page, which links the form and a Grant Application FAQ. No vet-submission requirement is stated.',
		maxAwardCents: null,
		maxAwardNote: 'No published cap',
		recurring: false,
		incomeRestricted: false,
		vetMustApply: false,
		isVerified: true,
		verifyNote: 'Loaded 2026-10-10. Grant form and FAQ both linked.',
		notes: null,
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_carecredit',
		name: 'CareCredit veterinary financing',
		url: 'https://www.carecredit.com/apply/',
		category: 'CREDIT',
		scope: 'NATIONAL',
		species: 'All pets',
		conditions:
			'Any veterinary cost at a practice in the CareCredit network (285,000+ locations), including emergencies, surgery, dentistry, diagnostics and specialty care. Accepted at the VBSPCA clinic.',
		eligibility:
			'US residents 18+ (21+ to apply by phone), subject to credit approval. No published income limit. Several local funds, including ART and Paws In Need, require you to apply for CareCredit first.',
		howToApply:
			'Apply online: choose \u201cVeterinary\u201d in the category dropdown and prequalify, or call 800-677-0718.',
		maxAwardCents: null,
		maxAwardNote: 'No published cap; the credit limit is set at approval',
		recurring: true,
		incomeRestricted: false,
		vetMustApply: false,
		isVerified: true,
		verifyNote:
			'Loaded 2026-10-10. New-account purchase APR 32.99% \u2014 always show the interest warning alongside this one.',
		notes: 'Credit, not a grant. Flag the APR whenever this is suggested.',
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_scratchpay',
		name: 'Scratch Pay payment plans',
		url: 'https://www.scratchpay.com/',
		category: 'PAYMENT_PLAN',
		scope: 'NATIONAL',
		species: 'All pets',
		conditions:
			'Veterinary bills at any of 17,000+ accepting practices \u2014 emergencies, surgery, dentals, specialty and referral care.',
		eligibility:
			'US pet owners, subject to credit approval. Checking eligibility is a soft pull and does not affect your credit score. Best rates need excellent credit.',
		howToApply:
			'Enter a phone number on the homepage, tap \u201cFind a Payment Plan\u201d, get a decision and rate, pick a 12- or 24-month plan, then get care. No application fee.',
		maxAwardCents: 1000000,
		maxAwardNote: 'Approved amounts run $200\u2013$10,000; 12\u201324 month terms at 0\u201336% APR, $15 down',
		recurring: true,
		incomeRestricted: false,
		vetMustApply: false,
		isVerified: true,
		verifyNote:
			'Loaded 2026-10-10. Rebranded from Scratchpay to Scratch Pay \u2014 older articles link the old name.',
		notes: 'Interest is waived on eligible 12- or 18-month plans paid off within 6 months.',
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_waggle',
		name: 'Waggle',
		url: 'https://waggle.org/',
		category: 'CHARITY',
		scope: 'NATIONAL',
		species: 'All pets, plus rescues and veterinary providers',
		conditions:
			'Emergency and life-saving veterinary bills. Owners, rescues and vets raise funds for a named animal\u2019s treatment.',
		eligibility:
			'Open to pet guardians, animal welfare organisations and veterinary providers. Recommended by The Pet Fund and the Virginia Beach SPCA.',
		howToApply: 'Start a campaign through \u201cGet Help\u201d on waggle.org, then share it to collect donations.',
		maxAwardCents: null,
		maxAwardNote: 'No published cap; each campaign sets its own goal',
		recurring: false,
		incomeRestricted: false,
		vetMustApply: false,
		isVerified: true,
		verifyNote: 'Loaded 2026-10-10. 501(c)(3) crowdfunding platform.',
		notes: 'Closest existing analogue to TakeTheLead\u2019s own campaign model \u2014 useful for competitive comparison.',
		createdById: 'seed_mod'
	}
];

/**
 * The four added sources: two Hampton Roads funds found through the VBSPCA's
 * own financial-assistance directory, the VBSPCA clinic itself, and one
 * Virginia-based dog fund.
 */
const addedFundingSources: SeedFundingSource[] = [
	{
		id: 'seed_fund_art',
		name: 'Animal Resources of Tidewater \u2014 Medical Assistance Program',
		url: 'https://artanimals.org/medical-assistance',
		category: 'CHARITY',
		scope: 'HAMPTON_ROADS',
		species: 'Dogs, Cats',
		conditions:
			'Routine care, some diagnostics and surgeries for qualifying families, plus one-time medication fills. For diabetes and Cushing\u2019s/Addison\u2019s they may cover testing plus initial medication. No MRI or CT. One-time help, not long-term care.',
		eligibility:
			'Primarily Hampton Roads residents. The pet needs a favourable prognosis. Every healthy dog and cat in the household must be fixed (ART can fund the alteration). You must apply for CareCredit first. One-time assistance per family.',
		howToApply:
			'Apply through the form on the Medical Assistance page. Allow 24\u201348 hours; the mailbox is not checked after 7pm on weekdays or after 12pm Saturday. PO Box 11535, Norfolk, VA 23517, (757) 456-1354, info@artanimals.org.',
		maxAwardCents: null,
		maxAwardNote: 'No published cap; surgeries over $1,000 are described as \u201ca huge consideration\u201d',
		recurring: false,
		incomeRestricted: true,
		vetMustApply: false,
		isVerified: true,
		verifyNote:
			'Loaded 2026-10-10. CAUTION: the page said applications were temporarily closed and reopen mid-October \u2014 confirm before referring an owner.',
		notes: 'Local. Apply in parallel elsewhere for anything over about $1,000.',
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_pawsinneed',
		name: 'Paws In Need, VA Inc. \u2014 Emergency Medical Fund',
		url: 'https://pawsinneedva.com/apply-for-help',
		category: 'CHARITY',
		scope: 'HAMPTON_ROADS',
		species: 'Dogs, Cats',
		conditions:
			'Life-saving emergency procedures and surgeries an owner cannot afford; also testing plus initial medication for diabetes, Cushing\u2019s/Addison\u2019s, thyroid disease and pancreatic insufficiency; and compassionate euthanasia or cremation where prognosis is poor. Not routine care, vaccines, nail trims or grooming.',
		eligibility:
			'Owners in Hampton Roads and parts of North Carolina. Favourable prognosis required. You must apply for CareCredit first and, if declined, for Scratch Pay. Spay/neuter strongly urged. One-time assistance per family.',
		howToApply:
			'Submit the \u201cRequest use of Medical Fund\u201d form on the Apply For Help page with your contact details, the pet\u2019s name, age, breed and altered status, and what you can contribute. Responses take 12\u201324 hours. (757) 231-5100.',
		maxAwardCents: null,
		maxAwardNote: 'No published cap',
		recurring: false,
		incomeRestricted: false,
		vetMustApply: false,
		isVerified: true,
		verifyNote:
			'Loaded 2026-10-10. Note the domain is pawsinneedva.com \u2014 pawsinneed.org is an unrelated Connecticut rescue.',
		notes: 'Local, and the fastest local turnaround at 12\u201324 hours.',
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_vbspca_clinic',
		name: 'Virginia Beach SPCA Clinic \u2014 low-cost care',
		url: 'https://vbspca.com/vbspca-clinic/',
		category: 'LOW_COST_CARE',
		scope: 'HAMPTON_ROADS',
		species: 'Dogs, Cats',
		conditions:
			'Wellness exams, vaccinations, lab work, heartworm treatment, dental procedures, orthopedic procedures, spay/neuter, nail trims, ear cleaning, anal glands, microchipping, prescription refills.',
		eligibility:
			'Reduced fees for households under $65,000 a year, plus active-duty military, reservists, dependents and first responders. Walk-in vaccine clinics and spay/neuter are open to every income; spay/neuter is priced by household income, so bring proof.',
		howToApply:
			'Book directly \u2014 use the online appointment request form at the bottom of the page, or call (757) 427-0071 and press 1. There is no grant application; you simply pay the reduced fee. Deposits are required for scheduled surgeries and surgical appointments need 2 business days\u2019 notice.',
		maxAwardCents: null,
		maxAwardNote:
			'Discounted fee schedule rather than a grant: feline spay $95 / neuter $75 for all incomes; canine spay $180\u2013$255 and neuter $150\u2013$230 under $65,000 income',
		recurring: true,
		incomeRestricted: true,
		vetMustApply: false,
		isVerified: true,
		verifyNote: 'Loaded 2026-10-10. Fee schedule and income cap read directly from the clinic page.',
		notes: 'Same site as the VBSPCA hospital listing; kept as a source because owners search for it as financial help.',
		createdById: 'seed_mod'
	},
	{
		id: 'seed_fund_mosby',
		name: 'The Mosby Foundation',
		url: 'https://themosbyfoundation.org/apply-for-aid/',
		category: 'CHARITY',
		scope: 'VIRGINIA',
		species: 'Dogs only',
		conditions:
			'Critical medical care, cancer, senior-dog care, heart health and spay/neuter for limited-income dog owners. Does not cover diagnostics, imaging, routine care, treatment already performed, or life-or-death emergencies.',
		eligibility:
			'Limited-income dog owners. Virginia-based 501(c)(3) that serves applicants nationwide. Every dog in the family must be fixed or scheduled to be, confirmed by your vet. One-time assistance per person, family or rescue. Favourable outcome required.',
		howToApply:
			'Complete the online Financial Aid Application in full \u2014 partial applications are not considered. Volunteer support line Wednesdays 1\u20133pm EST, (540) 885-2262.',
		maxAwardCents: null,
		maxAwardNote: 'No published cap',
		recurring: false,
		incomeRestricted: true,
		vetMustApply: false,
		isVerified: true,
		verifyNote: 'Loaded 2026-10-10. Dogs-only restriction confirmed on the Apply for Aid page.',
		notes: 'Dogs only, and explicitly not for emergencies \u2014 filter by species before suggesting.',
		createdById: 'seed_mod'
	}
];

export const seedFundingSources: SeedFundingSource[] = [
	...starterFundingSources,
	...addedFundingSources
];

/** Count assertions used by the seed log and the /database-test page (TTL-208). */
export const FUNDING_SOURCE_TARGETS = {
	starter: 11,
	added: 4,
	total: 15
} as const;

// ---------------------------------------------------------------------------
// Pets
// ---------------------------------------------------------------------------

export interface SeedPet {
	id: string;
	name: string;
	species: string;
	breed: string | null;
	dateOfBirth: Date | null;
	sex: string | null;
	photoUrl: string | null;
	bio: string | null;
	ownerId: string;
}

export const seedPets: SeedPet[] = [
	{ id: 'seed_pet_bella', name: 'Bella', species: 'Dog', breed: 'Golden Retriever', dateOfBirth: new Date('2019-04-12'), sex: 'F', photoUrl: 'https://picsum.photos/seed/bella/400/400', bio: 'Loves tennis balls and belly rubs.', ownerId: 'seed_maria' },
	{ id: 'seed_pet_max', name: 'Max', species: 'Cat', breed: 'Domestic Shorthair', dateOfBirth: new Date('2017-09-01'), sex: 'M', photoUrl: 'https://picsum.photos/seed/maxcat/400/400', bio: 'A dignified gentleman who demands breakfast at 5am.', ownerId: 'seed_maria' },
	{ id: 'seed_pet_whiskers', name: 'Whiskers', species: 'Cat', breed: 'Tabby', dateOfBirth: null, sex: 'M', photoUrl: 'https://picsum.photos/seed/whiskers/400/400', bio: 'Indoor cat, outdoor opinions.', ownerId: 'seed_maria' },
	{ id: 'seed_pet_ruby', name: 'Ruby', species: 'Dog', breed: 'Puppy (mixed)', dateOfBirth: new Date('2025-11-20'), sex: 'F', photoUrl: 'https://picsum.photos/seed/rubydog/400/400', bio: 'Tiny, loud, and worth every cent.', ownerId: 'seed_pat' },
	{ id: 'seed_pet_duke', name: 'Duke', species: 'Dog', breed: 'Labrador', dateOfBirth: new Date('2025-10-02'), sex: 'M', photoUrl: 'https://picsum.photos/seed/dukedog/400/400', bio: 'Ruby\u2019s big brother in every way that matters.', ownerId: 'seed_pat' }
];

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export interface SeedCampaign {
	id: string;
	slug: string;
	title: string;
	summary: string | null;
	body: string;
	coverImageUrl: string | null;
	status: string;
	visibility: string;
	goalAmountCents: number | null;
	deadline: Date | null;
	billAmountCents: number | null;
	allowGuestDonations: boolean;
	isOwnerAnonymous: boolean;
	ownerDisplayName: string | null;
	vetHospitalId: string | null;
	ownerId: string;
	publishedAt: Date | null;
	closedAt: Date | null;
	createdAt: Date;
}

/**
 * Six campaigns covering the state matrix the UI needs to template against:
 * live with a goal, live with no goal, anonymous owner, multi-pet co-managed,
 * awaiting moderation, and closed with a past deadline.
 */
export const seedCampaigns: SeedCampaign[] = [
	{
		id: 'seed_camp_bella',
		slug: 'bella-needs-acl-surgery',
		title: 'Bella Needs ACL Surgery',
		summary: 'Our 6-year-old Golden tore her ACL. Surgery is her only path back to running.',
		body: 'Bella has always been the dog who chases everything \u2014 tennis balls, squirrels, leaves. Two weeks ago she yelped mid-chase and stopped bearing weight on her back left leg. The orthopedic specialist confirmed a complete cranial cruciate ligament tear and recommended a TPLO surgery. The quote is far beyond what we can pay at once, so we are asking for help. Every dollar goes straight to the surgical invoice, and we will post the vet records here as they arrive.',
		coverImageUrl: 'https://picsum.photos/seed/bellacover/1200/800',
		status: 'APPROVED',
		visibility: 'PUBLIC',
		goalAmountCents: 350000,
		deadline: future(45),
		billAmountCents: 348000,
		allowGuestDonations: true,
		isOwnerAnonymous: false,
		ownerDisplayName: null,
		vetHospitalId: 'seed_hosp_vest',
		ownerId: 'seed_maria',
		publishedAt: daysAgo(20),
		closedAt: null,
		createdAt: daysAgo(22)
	},
	{
		id: 'seed_camp_max',
		slug: 'max-needs-insulin',
		title: 'Help Max Get His Insulin',
		summary: 'Max was just diagnosed with diabetes. Monthly insulin costs add up fast.',
		body: 'After a month of excessive water-drinking, Max came home with a diabetes diagnosis. He needs twice-daily insulin injections and monthly supplies. There is no single big surgery bill here \u2014 just a steady monthly cost we want to keep up with without skipping doses. No goal, no deadline: help when you can.',
		coverImageUrl: 'https://picsum.photos/seed/maxcover/1200/800',
		status: 'APPROVED',
		visibility: 'PUBLIC',
		goalAmountCents: null,
		deadline: null,
		billAmountCents: null,
		allowGuestDonations: true,
		isOwnerAnonymous: false,
		ownerDisplayName: null,
		vetHospitalId: 'seed_hosp_ghent',
		ownerId: 'seed_maria',
		publishedAt: daysAgo(15),
		closedAt: null,
		createdAt: daysAgo(16)
	},
	{
		id: 'seed_camp_whiskers',
		slug: 'whiskers-urinary-emergency',
		title: 'Whiskers\u2019 Midnight Emergency Surgery',
		summary: 'A blocked cat, a midnight ER visit, and a bill we did not see coming.',
		body: 'Whiskers came in to the emergency clinic at 1am unable to pass urine \u2014 a blocked cat is a same-night emergency, and the catheter, hospitalization, and follow-up surgery added up before we even got home. We are keeping our names off this story; his family is handling the updates.',
		coverImageUrl: 'https://picsum.photos/seed/whiskerscover/1200/800',
		status: 'APPROVED',
		visibility: 'PUBLIC',
		goalAmountCents: 220000,
		deadline: future(30),
		billAmountCents: 214500,
		allowGuestDonations: true,
		isOwnerAnonymous: true,
		ownerDisplayName: 'Whiskers\u2019 Family',
		vetHospitalId: 'seed_hosp_baybeach',
		ownerId: 'seed_maria',
		publishedAt: daysAgo(10),
		closedAt: null,
		createdAt: daysAgo(11)
	},
	{
		id: 'seed_camp_ruby_duke',
		slug: 'ruby-and-duke-parvo',
		title: 'Ruby & Duke vs. Parvo',
		summary: 'Two puppies, one virus, two hospital stays. Our sister is co-managing this fund.',
		body: 'We adopted Ruby and Duke from a shelter two weeks apart, and within days of each other both stopped eating. Parvo, both of them. They are in and out of IV fluids, and the household budget is not recovering any faster. Maria is helping us run this page while we are at the clinic.',
		coverImageUrl: 'https://picsum.photos/seed/puppiescover/1200/800',
		status: 'APPROVED',
		visibility: 'PUBLIC',
		goalAmountCents: 280000,
		deadline: future(60),
		billAmountCents: 276000,
		allowGuestDonations: true,
		isOwnerAnonymous: false,
		ownerDisplayName: null,
		vetHospitalId: 'seed_hosp_chesapeake',
		ownerId: 'seed_pat',
		publishedAt: daysAgo(12),
		closedAt: null,
		createdAt: daysAgo(14)
	},
	{
		id: 'seed_camp_ghost',
		slug: 'ghost-needs-hip-dysplasia-care',
		title: 'Ghost Needs Hip Dysplasia Care',
		summary: 'A rescue shepherd named Ghost needs staged hip treatment.',
		body: 'Ghost is a two-year-old German Shepherd rescue with hip dysplasia in both hips. His orthopedic plan is staged: pain management now, possible FHO surgery this fall. This campaign is awaiting moderation \u2014 which is exactly what a PENDING_REVIEW campaign looks like.',
		coverImageUrl: 'https://picsum.photos/seed/ghostdog/1200/800',
		status: 'PENDING_REVIEW',
		visibility: 'PUBLIC',
		goalAmountCents: 400000,
		deadline: null,
		billAmountCents: 180000,
		allowGuestDonations: true,
		isOwnerAnonymous: false,
		ownerDisplayName: null,
		vetHospitalId: 'seed_hosp_midway',
		ownerId: 'seed_pat',
		publishedAt: null,
		closedAt: null,
		createdAt: daysAgo(2)
	},
	{
		id: 'seed_camp_senior_cat',
		slug: 'senior-cat-hospice-fund',
		title: 'Senior Cat Hospice Fund (Closed)',
		summary: 'Our deadline passed and this fund is now closed. Kept to show terminal states.',
		body: 'Miso was 19. We raised what we needed before the deadline, cared for her through hospice, and closed this fund. She passed peacefully in August. This campaign stays up as a record, and as a demonstration of the CLOSED state with a past deadline.',
		coverImageUrl: 'https://picsum.photos/seed/seniorcat/1200/800',
		status: 'CLOSED',
		visibility: 'PUBLIC',
		goalAmountCents: 120000,
		deadline: daysAgo(60),
		billAmountCents: 118000,
		allowGuestDonations: false,
		isOwnerAnonymous: false,
		ownerDisplayName: null,
		vetHospitalId: 'seed_hosp_edinburgh',
		ownerId: 'seed_pat',
		publishedAt: daysAgo(120),
		closedAt: daysAgo(58),
		createdAt: daysAgo(121)
	}
];

// ---------------------------------------------------------------------------
// Campaign links
// ---------------------------------------------------------------------------

export const seedCampaignPets = [
	{ campaignId: 'seed_camp_bella', petId: 'seed_pet_bella', role: 'PRIMARY' as const },
	{ campaignId: 'seed_camp_max', petId: 'seed_pet_max', role: 'PRIMARY' as const },
	{ campaignId: 'seed_camp_whiskers', petId: 'seed_pet_whiskers', role: 'PRIMARY' as const },
	{ campaignId: 'seed_camp_ruby_duke', petId: 'seed_pet_ruby', role: 'PRIMARY' as const },
	{ campaignId: 'seed_camp_ruby_duke', petId: 'seed_pet_duke', role: 'SECONDARY' as const },
	{ campaignId: 'seed_camp_senior_cat', petId: 'seed_pet_max', role: 'SECONDARY' as const }
];

export interface SeedMember {
	campaignId: string;
	userId: string;
	role: MemberRole;
	status: MemberStatus;
	invitedById: string | null;
}

export const seedMembers: SeedMember[] = [
	{ campaignId: 'seed_camp_bella', userId: 'seed_maria', role: 'OWNER', status: 'ACCEPTED', invitedById: null },
	{ campaignId: 'seed_camp_bella', userId: 'seed_james', role: 'MANAGER', status: 'ACCEPTED', invitedById: 'seed_maria' },
	{ campaignId: 'seed_camp_max', userId: 'seed_maria', role: 'OWNER', status: 'ACCEPTED', invitedById: null },
	{ campaignId: 'seed_camp_whiskers', userId: 'seed_maria', role: 'OWNER', status: 'ACCEPTED', invitedById: null },
	{ campaignId: 'seed_camp_ruby_duke', userId: 'seed_pat', role: 'OWNER', status: 'ACCEPTED', invitedById: null },
	{ campaignId: 'seed_camp_ruby_duke', userId: 'seed_maria', role: 'MANAGER', status: 'ACCEPTED', invitedById: 'seed_pat' },
	{ campaignId: 'seed_camp_ghost', userId: 'seed_pat', role: 'OWNER', status: 'ACCEPTED', invitedById: null },
	{ campaignId: 'seed_camp_senior_cat', userId: 'seed_pat', role: 'OWNER', status: 'ACCEPTED', invitedById: null },
	// A still-pending invite and a viewer, to exercise the state matrix.
	{ campaignId: 'seed_camp_bella', userId: 'seed_pat', role: 'VIEWER', status: 'PENDING', invitedById: 'seed_maria' },
	{ campaignId: 'seed_camp_ghost', userId: 'seed_james', role: 'VIEWER', status: 'ACCEPTED', invitedById: 'seed_pat' }
];

export const seedImages = [
	{ id: 'seed_img_bella_1', campaignId: 'seed_camp_bella', url: 'https://picsum.photos/seed/bella1/1200/800', alt: 'Bella at the orthopedic specialist', sortOrder: 0, widthPx: 1200, heightPx: 800 },
	{ id: 'seed_img_bella_2', campaignId: 'seed_camp_bella', url: 'https://picsum.photos/seed/bella2/1200/800', alt: 'Bella mid-chase, before the injury', sortOrder: 1, widthPx: 1200, heightPx: 800 },
	{ id: 'seed_img_max_1', campaignId: 'seed_camp_max', url: 'https://picsum.photos/seed/max1/1200/800', alt: 'Max at his diagnosis appointment', sortOrder: 0, widthPx: 1200, heightPx: 800 },
	{ id: 'seed_img_whiskers_1', campaignId: 'seed_camp_whiskers', url: 'https://picsum.photos/seed/whiskers1/1200/800', alt: 'Whiskers recovering with his cone', sortOrder: 0, widthPx: 1200, heightPx: 800 },
	{ id: 'seed_img_puppies_1', campaignId: 'seed_camp_ruby_duke', url: 'https://picsum.photos/seed/ruby1/1200/800', alt: 'Ruby on IV fluids', sortOrder: 0, widthPx: 1200, heightPx: 800 },
	{ id: 'seed_img_puppies_2', campaignId: 'seed_camp_ruby_duke', url: 'https://picsum.photos/seed/duke1/1200/800', alt: 'Duke\u2019s first meal after treatment', sortOrder: 1, widthPx: 1200, heightPx: 800 },
	{ id: 'seed_img_ghost_1', campaignId: 'seed_camp_ghost', url: 'https://picsum.photos/seed/ghost1/1200/800', alt: 'Ghost on a long walk', sortOrder: 0, widthPx: 1200, heightPx: 800 },
	{ id: 'seed_img_miso_1', campaignId: 'seed_camp_senior_cat', url: 'https://picsum.photos/seed/miso1/1200/800', alt: 'Miso in her sunny hospice spot', sortOrder: 0, widthPx: 1200, heightPx: 800 }
];

// ---------------------------------------------------------------------------
// Promise to pay (TTL-211)
// ---------------------------------------------------------------------------

export interface SeedPromiseToPay {
	id: string;
	campaignId: string;
	billAmountCents: number;
	ttlCoversCents: number | null;
	ownerMaxObligationCents: number;
	ttlCoversText: string;
	ownerObligationText: string;
	accepted: boolean;
	acceptedBy: string | null;
	termsVersion: string;
}

/**
 * Every campaign that can be published has an ACCEPTED promise; the
 * PENDING_REVIEW Ghost campaign has an unaccepted draft so the moderation
 * guard has something to reject.
 *
 * The invariant enforced by `acceptPromiseToPay` is
 * `ttlCoversCents + ownerMaxObligationCents === billAmountCents`, so each row
 * below splits the bill between what TakeTheLead pays and what the owner owes.
 */
export const seedPromisesToPay: SeedPromiseToPay[] = [
	{
		id: 'seed_ptp_bella',
		campaignId: 'seed_camp_bella',
		billAmountCents: 348000,
		ttlCoversCents: 300000,
		ownerMaxObligationCents: 48000,
		ttlCoversText:
			'TakeTheLead pays the surgery invoice directly to the hospital as donations come in, up to $3,000.',
		ownerObligationText:
			'You owe up to $480 \u2014 whatever the fundraising does not reach. Nothing is due before the deadline.',
		accepted: true,
		acceptedBy: 'seed_maria',
		termsVersion: '2026-10'
	},
	{
		id: 'seed_ptp_max',
		campaignId: 'seed_camp_max',
		billAmountCents: 0,
		ttlCoversCents: 0,
		ownerMaxObligationCents: 0,
		ttlCoversText:
			'There is no single bill. TakeTheLead sends monthly insulin money to your clinic as donations come in.',
		ownerObligationText: 'You owe nothing up front. You only pay for care that fundraising does not cover.',
		accepted: true,
		acceptedBy: 'seed_maria',
		termsVersion: '2026-10'
	},
	{
		id: 'seed_ptp_whiskers',
		campaignId: 'seed_camp_whiskers',
		billAmountCents: 214500,
		ttlCoversCents: 180000,
		ownerMaxObligationCents: 34500,
		ttlCoversText:
			'TakeTheLead pays Bay Beach Emergency directly for the catheter, hospital stay and surgery, up to $1,800.',
		ownerObligationText: 'You owe up to $345 \u2014 whatever the fundraising does not reach.',
		accepted: true,
		acceptedBy: 'seed_maria',
		termsVersion: '2026-10'
	},
	{
		id: 'seed_ptp_ruby_duke',
		campaignId: 'seed_camp_ruby_duke',
		billAmountCents: 276000,
		ttlCoversCents: 250000,
		ownerMaxObligationCents: 26000,
		ttlCoversText:
			'TakeTheLead pays the parvo treatment bills to the hospital as donations arrive, up to $2,500.',
		ownerObligationText: 'You owe up to $260 \u2014 the gap between what we raise and the final bill.',
		accepted: true,
		acceptedBy: 'seed_pat',
		termsVersion: '2026-10'
	},
	{
		id: 'seed_ptp_senior_cat',
		campaignId: 'seed_camp_senior_cat',
		billAmountCents: 118000,
		ttlCoversCents: 118000,
		ownerMaxObligationCents: 0,
		ttlCoversText: 'TakeTheLead paid the hospice bill in full before the deadline.',
		ownerObligationText: 'Nothing was owed. The fund closed with $420 left over, which went to another pet.',
		accepted: true,
		acceptedBy: 'seed_pat',
		termsVersion: '2026-10'
	},
	// Deliberately NOT accepted: demonstrates the TTL-211 publish guard.
	{
		id: 'seed_ptp_ghost',
		campaignId: 'seed_camp_ghost',
		billAmountCents: 180000,
		ttlCoversCents: 150000,
		ownerMaxObligationCents: 30000,
		ttlCoversText: 'TakeTheLead pays the orthopedic clinic directly for Ghost\u2019s staged treatment, up to $1,500.',
		ownerObligationText: 'You owe up to $300 \u2014 whatever the fundraising does not reach.',
		accepted: false,
		acceptedBy: null,
		termsVersion: '2026-10'
	}
];

// ---------------------------------------------------------------------------
// Donations
// ---------------------------------------------------------------------------

export interface SeedDonation {
	id: string;
	campaignId: string;
	donorUserId: string | null;
	donorName: string | null;
	isAnonymous: boolean;
	amountCents: number;
	status: DonationStatus;
	provider: DonationProvider;
	message: string | null;
}

/**
 * 26 donations covering registered / guest donors, anonymous display, every
 * status, and the SIMULATED provider that TTL-207 uses before Stripe arrives.
 */
export const seedDonations: SeedDonation[] = [
	{ id: 'seed_don_b01', campaignId: 'seed_camp_bella', donorUserId: 'seed_james', donorName: null, isAnonymous: false, amountCents: 20000, status: 'COMPLETED', provider: 'MANUAL', message: 'For our girl \u2014 love you both.' },
	{ id: 'seed_don_b02', campaignId: 'seed_camp_bella', donorUserId: null, donorName: 'Grace L.', isAnonymous: false, amountCents: 5000, status: 'COMPLETED', provider: 'SIMULATED', message: 'From one Golden owner to another.' },
	{ id: 'seed_don_b03', campaignId: 'seed_camp_bella', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 10000, status: 'COMPLETED', provider: 'SIMULATED', message: null },
	{ id: 'seed_don_b04', campaignId: 'seed_camp_bella', donorUserId: 'seed_pat', donorName: null, isAnonymous: false, amountCents: 3000, status: 'COMPLETED', provider: 'SIMULATED', message: 'Not much, but she is a good girl.' },
	{ id: 'seed_don_b05', campaignId: 'seed_camp_bella', donorUserId: null, donorName: 'The Okafor Family', isAnonymous: false, amountCents: 25000, status: 'COMPLETED', provider: 'CHECK', message: 'Go Bella!' },
	{ id: 'seed_don_b06', campaignId: 'seed_camp_bella', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 15000, status: 'COMPLETED', provider: 'SIMULATED', message: 'Wishing her a fast recovery.' },
	{ id: 'seed_don_b07', campaignId: 'seed_camp_bella', donorUserId: 'seed_mod', donorName: null, isAnonymous: false, amountCents: 7500, status: 'COMPLETED', provider: 'MANUAL', message: 'Moderator hat off, donor hat on.' },
	{ id: 'seed_don_b08', campaignId: 'seed_camp_bella', donorUserId: null, donorName: 'Sam R.', isAnonymous: false, amountCents: 4000, status: 'PENDING', provider: 'MANUAL', message: 'Check is in the mail.' },
	{ id: 'seed_don_b09', campaignId: 'seed_camp_bella', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 50000, status: 'REFUNDED', provider: 'SIMULATED', message: null },
	{ id: 'seed_don_m01', campaignId: 'seed_camp_max', donorUserId: 'seed_pat', donorName: null, isAnonymous: false, amountCents: 2500, status: 'COMPLETED', provider: 'MANUAL', message: 'Monthly Max fund contribution.' },
	{ id: 'seed_don_m02', campaignId: 'seed_camp_max', donorUserId: null, donorName: 'Priya S.', isAnonymous: false, amountCents: 1500, status: 'COMPLETED', provider: 'SIMULATED', message: 'Diabetic cat dad here. Hang in there.' },
	{ id: 'seed_don_m03', campaignId: 'seed_camp_max', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 2000, status: 'COMPLETED', provider: 'SIMULATED', message: null },
	{ id: 'seed_don_m04', campaignId: 'seed_camp_max', donorUserId: null, donorName: 'Lena K.', isAnonymous: false, amountCents: 1000, status: 'FAILED', provider: 'SIMULATED', message: 'Card declined, will retry.' },
	{ id: 'seed_don_m05', campaignId: 'seed_camp_max', donorUserId: 'seed_james', donorName: null, isAnonymous: false, amountCents: 3000, status: 'COMPLETED', provider: 'CASH', message: 'Cash from the office kitty fund.' },
	{ id: 'seed_don_w01', campaignId: 'seed_camp_whiskers', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 30000, status: 'COMPLETED', provider: 'SIMULATED', message: 'Blocked cats scare every cat owner. Glad he is okay.' },
	{ id: 'seed_don_w02', campaignId: 'seed_camp_whiskers', donorUserId: 'seed_pat', donorName: null, isAnonymous: false, amountCents: 5000, status: 'COMPLETED', provider: 'SIMULATED', message: null },
	{ id: 'seed_don_w03', campaignId: 'seed_camp_whiskers', donorUserId: null, donorName: 'ER Doc Mike', isAnonymous: false, amountCents: 10000, status: 'COMPLETED', provider: 'SIMULATED', message: 'I saw this one coming. Take care of him.' },
	{ id: 'seed_don_w04', campaignId: 'seed_camp_whiskers', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 8000, status: 'PENDING', provider: 'SIMULATED', message: null },
	{ id: 'seed_don_r01', campaignId: 'seed_camp_ruby_duke', donorUserId: 'seed_maria', donorName: null, isAnonymous: false, amountCents: 15000, status: 'COMPLETED', provider: 'MANUAL', message: 'For my two favorite puppies.' },
	{ id: 'seed_don_r02', campaignId: 'seed_camp_ruby_duke', donorUserId: null, donorName: 'Shelter Friends', isAnonymous: false, amountCents: 40000, status: 'COMPLETED', provider: 'CHECK', message: 'From the whole adoption team.' },
	{ id: 'seed_don_r03', campaignId: 'seed_camp_ruby_duke', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 7000, status: 'COMPLETED', provider: 'SIMULATED', message: 'Parvo sucks. Puppies win.' },
	{ id: 'seed_don_r04', campaignId: 'seed_camp_ruby_duke', donorUserId: null, donorName: 'Chris & Ana', isAnonymous: false, amountCents: 12000, status: 'COMPLETED', provider: 'SIMULATED', message: 'So glad Duke kept his appetite.' },
	{ id: 'seed_don_r05', campaignId: 'seed_camp_ruby_duke', donorUserId: 'seed_james', donorName: null, isAnonymous: false, amountCents: 2000, status: 'CANCELLED', provider: 'SIMULATED', message: 'Double-clicked by accident.' },
	{ id: 'seed_don_g01', campaignId: 'seed_camp_ghost', donorUserId: 'seed_james', donorName: null, isAnonymous: false, amountCents: 5000, status: 'PENDING', provider: 'SIMULATED', message: 'Waiting on approval, sending early.' },
	{ id: 'seed_don_s01', campaignId: 'seed_camp_senior_cat', donorUserId: null, donorName: 'Neighborhood Book Club', isAnonymous: false, amountCents: 35000, status: 'COMPLETED', provider: 'CHECK', message: 'In honor of Miso.' },
	{ id: 'seed_don_s02', campaignId: 'seed_camp_senior_cat', donorUserId: 'seed_maria', donorName: null, isAnonymous: false, amountCents: 10000, status: 'COMPLETED', provider: 'MANUAL', message: 'She deserved every bit of sunshine.' },
	{ id: 'seed_don_s03', campaignId: 'seed_camp_senior_cat', donorUserId: null, donorName: 'Anonymous', isAnonymous: true, amountCents: 15000, status: 'REFUNDED', provider: 'SIMULATED', message: null }
];

// ---------------------------------------------------------------------------
// Vet records
// ---------------------------------------------------------------------------

export interface SeedVetRecord {
	id: string;
	campaignId: string;
	hospitalId: string | null;
	hospitalName: string | null;
	kind: VetRecordKind;
	title: string;
	amountCents: number | null;
	invoiceNumber: string | null;
	documentUrl: string | null;
	isVerified: boolean;
	verifiedById: string | null;
	uploadedById: string;
	createdAt: Date;
}

export const seedVetRecords: SeedVetRecord[] = [
	{
		id: 'seed_vr_bella_invoice',
		campaignId: 'seed_camp_bella',
		hospitalId: 'seed_hosp_vest',
		hospitalName: null,
		kind: 'INVOICE',
		title: 'TPLO surgery invoice',
		amountCents: 348000,
		invoiceNumber: 'VEST-2026-0412',
		documentUrl: 'https://storage.example/private/bella-invoice.pdf',
		isVerified: true,
		verifiedById: 'seed_mod',
		uploadedById: 'seed_maria',
		createdAt: daysAgo(21)
	},
	{
		id: 'seed_vr_bella_estimate',
		campaignId: 'seed_camp_bella',
		hospitalId: 'seed_hosp_vest',
		hospitalName: null,
		kind: 'ESTIMATE',
		title: 'Pre-op orthopedic consult estimate',
		amountCents: 32000,
		invoiceNumber: null,
		documentUrl: null,
		isVerified: false,
		verifiedById: null,
		uploadedById: 'seed_maria',
		createdAt: daysAgo(25)
	},
	{
		id: 'seed_vr_whiskers_invoice',
		campaignId: 'seed_camp_whiskers',
		hospitalId: 'seed_hosp_baybeach',
		hospitalName: null,
		kind: 'INVOICE',
		title: 'Emergency admission, catheter and stay',
		amountCents: 214500,
		invoiceNumber: 'BB-2026-1188',
		documentUrl: 'https://storage.example/private/whiskers-invoice.pdf',
		isVerified: true,
		verifiedById: 'seed_mod',
		uploadedById: 'seed_maria',
		createdAt: daysAgo(11)
	},
	{
		id: 'seed_vr_max_receipt',
		campaignId: 'seed_camp_max',
		hospitalId: 'seed_hosp_ghent',
		hospitalName: null,
		kind: 'RECEIPT',
		title: 'Monthly insulin and supplies',
		amountCents: 18500,
		invoiceNumber: null,
		documentUrl: null,
		isVerified: false,
		verifiedById: null,
		uploadedById: 'seed_maria',
		createdAt: daysAgo(14)
	},
	{
		id: 'seed_vr_puppies_invoice',
		campaignId: 'seed_camp_ruby_duke',
		hospitalId: 'seed_hosp_chesapeake',
		hospitalName: null,
		kind: 'INVOICE',
		title: 'Parvo hospitalization, both puppies',
		amountCents: 276000,
		invoiceNumber: 'CAH-2026-0731',
		documentUrl: 'https://storage.example/private/puppies-invoice.pdf',
		isVerified: true,
		verifiedById: 'seed_mod',
		uploadedById: 'seed_pat',
		createdAt: daysAgo(13)
	},
	{
		id: 'seed_vr_ghost_estimate',
		campaignId: 'seed_camp_ghost',
		hospitalId: 'seed_hosp_midway',
		hospitalName: null,
		kind: 'ESTIMATE',
		title: 'Staged hip treatment estimate',
		amountCents: 180000,
		invoiceNumber: null,
		documentUrl: null,
		isVerified: false,
		verifiedById: null,
		uploadedById: 'seed_pat',
		createdAt: daysAgo(3)
	},
	{
		// Free-text hospital fallback: exercises the hospitalId = null path.
		id: 'seed_vr_senior_receipt',
		campaignId: 'seed_camp_senior_cat',
		hospitalId: null,
		hospitalName: 'Hospice vet (not in directory)',
		kind: 'RECEIPT',
		title: 'Hospice and palliative care',
		amountCents: 118000,
		invoiceNumber: null,
		documentUrl: null,
		isVerified: true,
		verifiedById: 'seed_mod',
		uploadedById: 'seed_pat',
		createdAt: daysAgo(125)
	}
];

// ---------------------------------------------------------------------------
// Moderation trail
// ---------------------------------------------------------------------------

export interface SeedReview {
	id: string;
	campaignId: string;
	reviewerId: string;
	decision: ReviewDecision;
	reason: string;
	createdAt: Date;
}

export const seedReviews: SeedReview[] = [
	{ id: 'seed_review_bella_1', campaignId: 'seed_camp_bella', reviewerId: 'seed_mod', decision: 'CHANGES_REQUESTED', reason: 'Please attach the signed surgical estimate before we can approve.', createdAt: daysAgo(21) },
	{ id: 'seed_review_bella_2', campaignId: 'seed_camp_bella', reviewerId: 'seed_mod', decision: 'APPROVED', reason: 'Invoice verified against Veterinary Emergency & Specialty of Tidewater. Approved.', createdAt: daysAgo(20) },
	{ id: 'seed_review_max_1', campaignId: 'seed_camp_max', reviewerId: 'seed_mod', decision: 'APPROVED', reason: 'Receipt looks legitimate. Approved.', createdAt: daysAgo(15) },
	{ id: 'seed_review_whiskers_1', campaignId: 'seed_camp_whiskers', reviewerId: 'seed_mod', decision: 'APPROVED', reason: 'Anonymous owner request honored; invoice verified.', createdAt: daysAgo(10) },
	{ id: 'seed_review_puppies_1', campaignId: 'seed_camp_ruby_duke', reviewerId: 'seed_mod', decision: 'APPROVED', reason: 'Approved. Invoice matches the Chesapeake Animal Hospital account.', createdAt: daysAgo(12) },
	{ id: 'seed_review_senior_1', campaignId: 'seed_camp_senior_cat', reviewerId: 'seed_mod', decision: 'APPROVED', reason: 'Approved at publish time.', createdAt: daysAgo(120) }
];

// ---------------------------------------------------------------------------
// Date helpers (kept local so the data file has no imports at runtime)
// ---------------------------------------------------------------------------

function daysAgo(n: number): Date {
	return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysAhead(n: number): Date {
	return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

/** Alias used in the campaign table for readability. */
function future(n: number): Date {
	return daysAhead(n);
}
