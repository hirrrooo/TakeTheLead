<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		ArrowLeft,
		BadgeCheck,
		ExternalLink,
		HeartHandshake,
		Info,
		PawPrint,
		ShieldCheck
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

	type Provider = {
		name: string;
		href: string;
		tagline: string;
		points: string[];
	};

	const providers: Provider[] = [
		{
			name: 'Fetch Pet Insurance',
			href: 'https://www.fetchpet.com/',
			tagline: 'App-based coverage with optional wellness plans.',
			points: [
				'Covers a large share of unexpected vet bills, with routine and wellness add-ons available.',
				'Digital-first signup and claims, managed from your phone.',
				'Covers dogs and cats.'
			]
		},
		{
			name: 'Progressive Pet Insurance',
			href: 'https://www.progressive.com/pet-insurance/',
			tagline: 'Pet coverage from a carrier you may already trust.',
			points: [
				'Quote by ZIP code directly on the Progressive site.',
				'Can be considered alongside auto and home policies.',
				'Rate and coverage are provided and serviced by third parties, so read the policy details.'
			]
		},
		{
			name: 'Trupanion Pet Insurance',
			href: 'https://www.trupanion.com/pet-insurance',
			tagline: 'Accident-and-illness coverage with no payout limits.',
			points: [
				'Pays a set percentage of covered veterinary costs after your deductible.',
				'No upper limit on payout amounts per condition.',
				'Use any licensed veterinarian in the U.S. or Canada.'
			]
		},
		{
			name: 'Spot Pet Insurance',
			href: 'https://spotpet.com/',
			tagline: 'Highly customizable plans for dogs and cats.',
			points: [
				'Choose your deductible, reimbursement level, and annual limit.',
				'Add routine and wellness coverage on top of accident and illness.',
				'Multi-pet discounts are available.'
			]
		},
		{
			name: 'Lemonade Pet Insurance',
			href: 'https://www.lemonade.com/pet',
			tagline: 'Fast, fully digital quotes and claims.',
			points: [
				'Sign up in minutes and file claims from the app.',
				'Build a plan around accident, illness, and optional routine care.',
				'Covers dogs and cats.'
			]
		},
		{
			name: 'Nationwide Pet Insurance',
			href: 'https://www.nationwide.com/personal/insurance/pet/',
			tagline: 'Long-established carrier with several plan tiers.',
			points: [
				'Accident-only, accident-and-illness, and wellness-style options.',
				'One of the few carriers that has offered coverage for some exotic pets.',
				'Backed by a large national insurance company.'
			]
		}
	];
</script>

<svelte:head>
	<title>Pet Insurance Options | Take the Lead</title>
	<meta
		name="description"
		content="A starting list of well-known pet insurance companies — Fetch, Progressive, Trupanion, Spot, Lemonade, and Nationwide — with links to get a quote from each."
	/>
</svelte:head>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 md:py-14">
	<header class="flex flex-col items-center gap-3 text-center">
		<span
			class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
			aria-hidden="true"
		>
			<ShieldCheck class="size-6" />
		</span>
		<h1>Pet Insurance Options</h1>
		<p class="max-w-2xl text-balance text-muted-foreground">
			Pet insurance won’t prevent a vet bill, but it can keep a big one from becoming impossible.
			Here are some well-known companies to start your search with.
		</p>
	</header>

	<Card class="border-primary/30 bg-primary/5" aria-labelledby="how-to-read-this">
		<CardHeader>
			<div class="flex flex-wrap items-center justify-center gap-3">
				<span
					class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
					aria-hidden="true"
				>
					<Info class="size-6" />
				</span>
				<CardTitle id="how-to-read-this" class="text-2xl">How to read this list</CardTitle>
			</div>
		</CardHeader>
		<CardContent>
			<p class="mx-auto max-w-3xl leading-relaxed text-balance">
				Every plan is judged on the same few numbers: the <strong>monthly premium</strong>, the
				<strong>deductible</strong>, the <strong>reimbursement percentage</strong>, the
				<strong>annual limit</strong>, and whether <strong>pre-existing conditions</strong> are excluded.
				Those terms change with your pet’s age, breed, and ZIP code, so the blocks below are a place to
				start comparing, not a recommendation.
			</p>
		</CardContent>
	</Card>

	<section class="flex flex-col gap-6" aria-labelledby="providers-heading">
		<h2 id="providers-heading" class="text-center">Pet Insurance Companies</h2>
		<div class="grid gap-6 md:grid-cols-2">
			{#each providers as provider (provider.name)}
				<Card class="flex h-full flex-col">
					<CardHeader>
						<span
							class="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
							aria-hidden="true"
						>
							<PawPrint class="size-5" />
						</span>
						<CardTitle>{provider.name}</CardTitle>
						<CardDescription>{provider.tagline}</CardDescription>
					</CardHeader>
					<CardContent class="flex-1">
						<ul class="flex flex-col gap-2">
							{#each provider.points as point (point)}
								<li class="flex items-start gap-2 text-sm leading-relaxed">
									<BadgeCheck class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
									<span>{point}</span>
								</li>
							{/each}
						</ul>
					</CardContent>
					<CardFooter>
						<Button
							variant="outline"
							size="sm"
							class="w-full gap-2"
							href={provider.href}
							target="_blank"
							rel="noopener noreferrer external"
						>
							<ExternalLink class="size-4" aria-hidden="true" />
							Visit {provider.name.replace(' Pet Insurance', '')}
							<span class="sr-only">in a new tab</span>
						</Button>
					</CardFooter>
				</Card>
			{/each}
		</div>
	</section>

	<Card class="border-primary/30 bg-primary/5" aria-labelledby="disclaimer-heading">
		<CardHeader>
			<div class="flex flex-wrap items-center justify-center gap-3">
				<span
					class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
					aria-hidden="true"
				>
					<HeartHandshake class="size-6" />
				</span>
				<CardTitle id="disclaimer-heading" class="text-2xl">Disclaimer</CardTitle>
			</div>
		</CardHeader>
		<CardContent>
			<p class="mx-auto max-w-3xl leading-relaxed text-balance">
				The companies listed above are only a handful of the pet insurance providers available. They
				are not ranked, endorsed, or affiliated with Take the Lead, and availability, pricing, and
				coverage terms vary by state and by pet. If none of these plans fit you and your pet, you
				are encouraged to shop around — compare quotes from other pet insurance companies, ask your
				veterinarian which carriers they see most often, and read the actual policy before you buy.
				The right plan is the one that fits your pet’s needs and your budget.
			</p>
		</CardContent>
	</Card>

	<div class="flex flex-wrap justify-center gap-3">
		<Button href={resolve('/homepage')} class="gap-2">
			<ArrowLeft class="size-4" aria-hidden="true" />
			Back to home
		</Button>
		<Button variant="outline" href={resolve('/campaign')}>Browse campaigns</Button>
	</div>
</main>
