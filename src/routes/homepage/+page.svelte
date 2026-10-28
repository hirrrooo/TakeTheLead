<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		ArrowLeft,
		Banknote,
		BookOpen,
		CalendarDays,
		Check,
		Copy,
		HeartHandshake,
		PawPrint,
		PhoneCall,
		Search,
		Users
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const isMember = $derived(Boolean(data.user));

	const now = Date.now();
	const greeting = $derived.by(() => {
		const hour = new Date(now).getHours();
		if (hour < 12) return 'Good morning';
		if (hour < 17) return 'Good afternoon';
		return 'Good evening';
	});

	const resources = [
		{ label: 'Veterinary Costs and Why', href: '/contact-us' },
		{ label: 'Pet Insurance', href: '/contact-us' },
		{ label: 'Pet Credit Cards', href: '/contact-us' },
		{ label: 'Additional Information', href: '/contact-us' }
	];

	let copiedId = $state<string | null>(null);

	async function copyLink(campaign: { id: string; slug: string }) {
		try {
			await navigator.clipboard.writeText(`${window.location.origin}/campaign/${campaign.slug}`);
			copiedId = campaign.id;
			setTimeout(() => {
				if (copiedId === campaign.id) copiedId = null;
			}, 2000);
		} catch {
			// Clipboard unavailable (e.g. insecure context); nothing to do.
		}
	}
</script>

<svelte:head>
	<title>Home | Take the Lead</title>
	<meta
		name="description"
		content="Take the Lead removes the barrier between pet owners and urgent veterinary care. Welcome to your community."
	/>
</svelte:head>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 md:py-14">
	<!-- Top bar with Login link (in case a member bypassed the login process) -->
	<header class="flex flex-wrap items-center justify-between gap-4">
		<a href={resolve('/')} class="inline-flex items-center gap-2.5">
			<span class="flex size-10 items-center justify-center rounded-xl bg-primary">
				<img src="/ttl-logo.svg" alt="" class="size-6" />
			</span>
			<span class="font-heading text-lg font-bold">Take the Lead</span>
		</a>
		<div class="flex items-center gap-3">
			{#if isMember}
				<span class="hidden text-sm text-muted-foreground sm:inline">
					Signed in as {data.user?.name}
				</span>
				<form method="POST" action="?/signOut">
					<Button variant="outline" type="submit">Logout</Button>
				</form>
			{:else}
				<Button variant="outline" href={resolve('/login')}>Login</Button>
			{/if}
		</div>
	</header>

	<!-- Welcome + center-top campaign button -->
	<section class="flex flex-col items-center gap-6 text-center">
		<span
			class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
			aria-hidden="true"
		>
			<PawPrint class="size-7" />
		</span>
		<div class="space-y-2">
			<h1>
				{greeting}{#if isMember}, {data.user?.name}{/if}!
			</h1>
			<p class="max-w-2xl text-balance text-muted-foreground">
				{#if isMember}
					Welcome back to Take the Lead — your pet's care is our lead priority. Pick up where you
					left off or start something new.
				{:else}
					Welcome to Take the Lead! We help pet owners get urgent veterinary care without the
					upfront barrier — funded by their community.
					<a
						href={resolve('/login')}
						class="font-medium text-primary underline-offset-4 hover:underline">Create an account</a
					>
					to launch your own campaign.
				{/if}
			</p>
		</div>

		{#if isMember && !data.hasActiveCampaign}
			<Button size="lg" href={resolve('/dashboard')} class="gap-2">
				Check on Campaign or Create New One
				<ArrowLeft class="size-4 rotate-180" aria-hidden="true" />
			</Button>
		{:else if isMember}
			<Button variant="outline" size="lg" href={resolve('/dashboard')} class="gap-2">
				Go to Your Dashboard
				<ArrowLeft class="size-4 rotate-180" aria-hidden="true" />
			</Button>
		{/if}
	</section>

	<!-- Emergency box -->
	<Card
		class="border-destructive/30 bg-destructive/5 text-center"
		aria-labelledby="emergency-heading"
	>
		<CardHeader>
			<div class="flex flex-wrap items-center justify-center gap-3">
				<span
					class="flex size-11 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
					aria-hidden="true"
				>
					<PhoneCall class="size-6" />
				</span>
				<CardTitle id="emergency-heading" class="text-2xl">
					Experiencing an Emergency? Let us Help
				</CardTitle>
			</div>
			<CardDescription class="mt-2">
				<strong class="font-semibold tracking-wide text-destructive uppercase"
					>Search availability coming soon</strong
				>
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<p class="text-sm leading-relaxed text-muted-foreground">
				Input your zipcode so we can match you to the closest emergency care specialist in your area
				(information is subject to change and may not be correct at the time of search; please call
				before driving to a location).
			</p>
			<div class="mx-auto flex max-w-md gap-2" aria-hidden="true">
				<Input placeholder="Zipcode" disabled />
				<Button disabled>
					<Search class="size-4" />
					Search
				</Button>
			</div>
		</CardContent>
	</Card>

	<!-- Info boxes -->
	<section class="space-y-6" aria-labelledby="about-heading">
		<h2 id="about-heading" class="text-center">What is Take The Lead?</h2>

		<div class="grid gap-6 md:grid-cols-3">
			<Card class="text-center">
				<CardHeader>
					<span
						class="mx-auto mb-1 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"
						aria-hidden="true"
					>
						<HeartHandshake class="size-6" />
					</span>
					<CardTitle>We Remove the Barrier</CardTitle>
				</CardHeader>
				<CardContent>
					<p class="text-sm leading-relaxed text-muted-foreground">
						We help Members with urgent veterinary bills so pet owners can get the care for their
						pets immediately.
					</p>
				</CardContent>
			</Card>

			<Card class="text-center">
				<CardHeader>
					<span
						class="mx-auto mb-1 flex size-11 items-center justify-center rounded-full bg-accent/10 text-accent"
						aria-hidden="true"
					>
						<Users class="size-6" />
					</span>
					<CardTitle>We Are The Community</CardTitle>
				</CardHeader>
				<CardContent>
					<p class="text-sm leading-relaxed text-muted-foreground">
						Create an Account and Launch a 30-day Campaign that allows for friends, neighbors and
						associates to donate to your cause.
					</p>
					<p class="mt-3 text-xs leading-relaxed text-muted-foreground/80">
						Note: Take The Lead does require authentication between costs and the Veterinarian
						Office listed.
					</p>
				</CardContent>
			</Card>

			<Card class="text-center">
				<CardHeader>
					<span
						class="mx-auto mb-1 flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
						aria-hidden="true"
					>
						<Banknote class="size-6" />
					</span>
					<CardTitle>How Are Members Funded?</CardTitle>
				</CardHeader>
				<CardContent>
					<p class="text-sm leading-relaxed text-muted-foreground">
						All Donations go to the pet — The Vet Offices are to be paid, but anything in excess
						goes to the Member. We have donation offers for those that want to continue the cause
						and help another Pet Parent in need!
					</p>
				</CardContent>
			</Card>
		</div>

		<Card class="text-center">
			<CardHeader>
				<div class="flex flex-wrap items-center justify-center gap-3">
					<span
						class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
						aria-hidden="true"
					>
						<BookOpen class="size-6" />
					</span>
					<CardTitle class="text-2xl">Educate and Encourage!</CardTitle>
				</div>
				<CardDescription class="mt-2">
					Check out these links to additional resources while your Campaign runs!
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ul class="grid justify-items-center gap-2 sm:grid-cols-2">
					{#each resources as resource (resource.label)}
						<li>
							<a
								href={resource.href}
								class="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
							>
								<ArrowLeft class="size-3.5 -rotate-45" aria-hidden="true" />
								{resource.label}
							</a>
						</li>
					{/each}
				</ul>
			</CardContent>
		</Card>
	</section>

	<!-- Live campaign showcase -->
	<section
		class="rounded-2xl border border-accent/25 bg-accent/5 p-6 md:p-8"
		aria-labelledby="showcase-heading"
	>
		<div class="mb-6 space-y-1 text-center">
			<h2 id="showcase-heading" class="text-accent">Live Campaigns</h2>
			<p class="text-sm text-muted-foreground">
				These pets need your help right now. Click a campaign to see its story and donate.
			</p>
		</div>

		{#if data.liveCampaigns.length === 0}
			<p
				class="rounded-xl border border-dashed border-accent/40 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground"
			>
				No live campaigns right now. Be the first to
				<a
					href={resolve('/login')}
					class="font-medium text-accent underline-offset-4 hover:underline">launch one</a
				>!
			</p>
		{:else}
			<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.liveCampaigns as campaign (campaign.id)}
					<article
						class="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
					>
						<a
							href={resolve('/campaign/[slug]', { slug: campaign.slug })}
							class="flex h-full flex-col focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							aria-label="View {campaign.title}"
						>
							<div class="relative aspect-[16/9] w-full overflow-hidden bg-muted">
								{#if campaign.coverImageUrl}
									<img
										src={campaign.coverImageUrl}
										alt=""
										loading="lazy"
										class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
									/>
								{:else}
									<span
										class="flex size-full items-center justify-center bg-accent/10 text-accent"
										aria-hidden="true"
									>
										<PawPrint class="size-10" />
									</span>
								{/if}
								<span
									class="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground"
								>
									<span class="size-1.5 animate-pulse rounded-full bg-background"></span>
									LIVE
								</span>
							</div>

							<div class="flex flex-1 flex-col gap-3 p-4 text-center">
								<h3
									class="font-heading text-lg leading-snug font-bold text-card-foreground group-hover:text-accent"
								>
									{campaign.title}
								</h3>
								{#if campaign.petName}
									<p class="text-xs text-muted-foreground">For {campaign.petName}</p>
								{/if}

								<div class="mt-auto space-y-1.5 pt-2">
									<div class="flex items-baseline justify-between text-xs">
										<span class="font-semibold text-accent">{campaign.percent}% funded</span>
										<span class="inline-flex items-center gap-1 text-muted-foreground">
											<CalendarDays class="size-3.5" aria-hidden="true" />
											{campaign.daysLeft} days left
										</span>
									</div>
									<div
										class="h-2 w-full overflow-hidden rounded-full bg-muted"
										role="progressbar"
										aria-valuenow={campaign.percent}
										aria-valuemin={0}
										aria-valuemax={100}
										aria-label="Funding progress for {campaign.title}"
									>
										<div
											class="h-full rounded-full bg-accent transition-[width] duration-500"
											style:width="{campaign.percent}%"
										></div>
									</div>
								</div>
							</div>
						</a>

						<button
							type="button"
							class="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background hover:text-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							title="Copy campaign link"
							aria-label="Copy link for {campaign.title}"
							onclick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								copyLink(campaign);
							}}
						>
							{#if copiedId === campaign.id}
								<Check class="size-4 text-accent" aria-hidden="true" />
							{:else}
								<Copy class="size-4" aria-hidden="true" />
							{/if}
						</button>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	<footer class="border-t pt-6 text-center text-xs text-muted-foreground">
		© {new Date().getFullYear()} Take the Lead. Every stride counts for a pet in need.
	</footer>
</main>
