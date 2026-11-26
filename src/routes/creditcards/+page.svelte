<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		ArrowLeft,
		BadgeCheck,
		Banknote,
		CircleCheck,
		CreditCard,
		ExternalLink,
		HeartHandshake,
		Info,
		Percent,
		PiggyBank,
		Scale,
		ShieldCheck,
		Store,
		TriangleAlert
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

	const cards = [
		{
			name: 'CareCredit',
			issuer: 'Health and wellness credit card',
			Icon: CreditCard,
			tagline:
				'A health and wellness credit card accepted at 285,000+ providers, including a large network of veterinary hospitals, with promotional financing plans.',
			criteria: [
				'You must be at least 18 to apply online (21 or older to apply by phone).',
				'Subject to credit approval. You can check if you prequalify online without affecting your credit score.',
				'Only works at providers that accept CareCredit, so confirm your veterinary hospital is in the network before you count on it.',
				'Promotional monthly-payment plans generally require a minimum purchase of $200 or more at a participating location.',
				'Deferred-interest plans add interest back to the original balance if the plan is not paid in full by the end of the promotion, or if a payment is missed.'
			],
			href: 'https://www.carecredit.com/',
			siteLabel: 'Visit CareCredit'
		},
		{
			name: 'All Pet Card',
			issuer: 'Single-usage card for pet care',
			Icon: HeartHandshake,
			tagline:
				'A card offered exclusively through participating pet care providers, meant for putting today’s vet bill on a monthly payment plan.',
			criteria: [
				'Usable only at participating pet care providers — it is not a general-purpose card for other retail spending.',
				'Applications usually start in the clinic’s office, since the card is issued through the provider network.',
				'Prequalification gives an answer right away with no impact to your credit score.',
				'No annual fee, no down payment and no early payment penalties.',
				'Covers routine, emergency and specialty care, plus boarding, daycare, grooming, training and prescription medicine at participating locations.',
				'Fixed monthly payment plans — the plan you qualify for depends on the amount you are financing.'
			],
			href: 'https://allpet.com/',
			siteLabel: 'Visit All Pet Card'
		},
		{
			name: 'Nibbles Credit Card',
			issuer: 'Pet card with bundled insurance',
			Icon: ShieldCheck,
			tagline:
				'A pet-focused card that pairs rewards at pet stores and the vet with a pet insurance policy for one eligible pet.',
			criteria: [
				'No annual fee.',
				'Variable APR of US Prime + 17.74%, with a stated maximum of 29.99%.',
				'Includes a pet insurance policy for one eligible pet with the premium paid by Nibbles. A sample base policy pays 80% of eligible covered expenses after a $700 annual deductible, up to $10,000 per year.',
				'Coverage details differ by state and by sign-up date, and the card is not available in every state yet.',
				'Earns 3x rewards at pet stores and the vet, with terms applying to the rewards program.',
				'Additional pets can usually be added for a discount, and the included coverage generally depends on staying in good standing on the card.'
			],
			href: 'https://nibbles.com/',
			siteLabel: 'Visit Nibbles'
		},
		{
			name: 'Discover it Cash Back',
			issuer: 'General cash-back card',
			Icon: PiggyBank,
			tagline:
				'Not a pet-specific card, but a widely used cash-back option that works at any veterinary office that accepts Discover.',
			criteria: [
				'No annual fee.',
				'Unlimited Cashback Match: all the cash back you earn during the first year is matched dollar for dollar at the end of that year, automatically.',
				'Rotating bonus categories must be activated each quarter, and veterinary bills usually fall outside them and earn the flat base rate.',
				'Acceptance is narrower than Visa and Mastercard, so ask the hospital before you apply.',
				'Typically aimed at good to excellent credit. “Check My Eligibility” gives you a prequalification answer without a hard inquiry.',
				'Cash back is only earned on purchases, so it helps most when you would be paying the bill on a card anyway.'
			],
			href: 'https://www.discover.com/credit-cards/cash-back/',
			siteLabel: 'Visit Discover'
		}
	];

	const comparison = [
		{
			title: 'Where the card is accepted',
			Icon: Store,
			text: 'Pet cards are often single-usage, meaning they only work inside one provider network. Confirm your own hospital accepts the card before you apply.'
		},
		{
			title: 'APR and how interest is charged',
			Icon: Percent,
			text: 'Pet care cards usually carry a higher APR than an ordinary card. Deferred interest means the full interest can be added back if you miss the payoff date.'
		},
		{
			title: 'Annual fee and other costs',
			Icon: Banknote,
			text: 'Several pet cards advertise no annual fee. Also look for late fees, returned-payment fees, and whether the plan is a fixed term or revolving.'
		},
		{
			title: 'Credit requirement',
			Icon: BadgeCheck,
			text: 'Most require credit approval. A soft-pull prequalification tells you whether you are likely to be approved without affecting your credit score.'
		},
		{
			title: 'Minimum purchase for a plan',
			Icon: Scale,
			text: 'Promotional monthly-payment plans frequently apply only above a minimum bill, so a small invoice may qualify for the regular revolving rate alone.'
		},
		{
			title: 'Perks beyond the financing',
			Icon: CircleCheck,
			text: 'Some cards add rewards, cash back, or an included insurance policy. Read what the perk actually covers and what it costs to keep it active.'
		}
	];
</script>

<svelte:head>
	<title>Pet Credit Cards | Take the Lead</title>
	<meta
		name="description"
		content="Companies that offer pet credit cards — CareCredit, All Pet Card, Nibbles and Discover — with the criteria to check for each one before you apply."
	/>
</svelte:head>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 md:py-14">
	<header class="flex flex-col items-center gap-3 text-center">
		<span
			class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
			aria-hidden="true"
		>
			<CreditCard class="size-6" />
		</span>
		<h1>Pet Credit Cards</h1>
		<p class="max-w-2xl text-balance text-muted-foreground">
			A few of the companies that offer financing for veterinary bills, and the criteria worth
			checking on each card before you apply.
		</p>
	</header>

	<section class="flex flex-col gap-6" aria-labelledby="card-offers-heading">
		<h2 id="card-offers-heading" class="text-center">Companies That Offer Pet Credit Cards</h2>
		<div class="grid gap-6 md:grid-cols-2">
			{#each cards as { name, issuer, Icon, tagline, criteria, href, siteLabel } (name)}
				<Card class="flex h-full flex-col">
					<CardHeader>
						<span
							class="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
							aria-hidden="true"
						>
							<Icon class="size-5" />
						</span>
						<CardTitle>{name}</CardTitle>
						<CardDescription>{issuer}</CardDescription>
					</CardHeader>
					<CardContent class="flex flex-1 flex-col gap-4">
						<p class="leading-relaxed">{tagline}</p>
						<div class="rounded-lg border bg-muted/40 p-4">
							<h3 class="mb-2 text-sm font-semibold">What you’ll need to know</h3>
							<ul class="flex flex-col gap-2">
								{#each criteria as point (point)}
									<li class="flex gap-2 text-sm leading-relaxed text-muted-foreground">
										<CircleCheck class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
										<span>{point}</span>
									</li>
								{/each}
							</ul>
						</div>
						<div class="mt-auto">
							<Button variant="outline" size="sm" {href} target="_blank" rel="noopener noreferrer">
								<ExternalLink data-icon="inline-start" aria-hidden="true" />
								{siteLabel}
							</Button>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	</section>

	<section class="flex flex-col gap-6" aria-labelledby="comparison-heading">
		<h2 id="comparison-heading" class="text-center">Criteria To Compare On Any Pet Card</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each comparison as { title, Icon, text } (title)}
				<Card class="h-full">
					<CardHeader>
						<span
							class="mb-1 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary"
							aria-hidden="true"
						>
							<Icon class="size-4" />
						</span>
						<CardTitle class="text-base">{title}</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription class="leading-relaxed">{text}</CardDescription>
					</CardContent>
				</Card>
			{/each}
		</div>
	</section>

	<section class="flex flex-col gap-4" aria-labelledby="store-cards-heading">
		<h2 id="store-cards-heading" class="text-center">Store-Affiliated Cards and Rewards</h2>
		<Card class="border-primary/30 bg-primary/5">
			<CardHeader>
				<div class="flex flex-wrap items-center gap-3">
					<span
						class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
						aria-hidden="true"
					>
						<Store class="size-6" />
					</span>
					<CardTitle class="text-xl">Shopping at a specific chain?</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<p class="leading-relaxed">
					Some store-affiliated credit cards, such as retail pet store cards, can provide rewards or
					perks when you shop regularly at a specific chain or at its clinics. You can also use
					cash-back rewards on your credit card when you order supplies for your pet.
				</p>
			</CardContent>
		</Card>
	</section>

	<section aria-labelledby="disclaimer-heading">
		<Card class="border-muted-foreground/25 bg-muted/40">
			<CardHeader>
				<div class="flex flex-wrap items-center gap-3">
					<span
						class="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground"
						aria-hidden="true"
					>
						<TriangleAlert class="size-5" />
					</span>
					<CardTitle id="disclaimer-heading" class="text-lg">Disclaimer</CardTitle>
				</div>
			</CardHeader>
			<CardContent class="flex flex-col gap-3">
				<p class="text-sm leading-relaxed text-muted-foreground">
					The information on this page was gathered through brief research and may be subject to
					change at any time. Take the Lead is not affiliated with any of the companies listed here,
					and nothing on this page is financial advice. We encourage you to reach out to these
					companies directly to confirm their current terms and to open a credit card with them —
					you cannot open a card through us.
				</p>
				<p class="flex items-center gap-2 text-sm leading-relaxed text-muted-foreground">
					<Info class="size-4 shrink-0" aria-hidden="true" />
					Always read the cardholder agreement and disclosure statement before you apply or finance a
					veterinary bill.
				</p>
			</CardContent>
		</Card>
	</section>

	<div class="flex flex-wrap justify-center gap-3">
		<Button href={resolve('/homepage')} class="gap-2">
			<ArrowLeft class="size-4" aria-hidden="true" />
			Back to home
		</Button>
		<Button variant="outline" href={resolve('/campaign')}>Browse campaigns</Button>
	</div>
</main>
