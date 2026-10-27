<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	function setStartTimezone(event: SubmitEvent) {
		const formElement = event.currentTarget;
		if (!(formElement instanceof HTMLFormElement)) return;

		const dateInput = formElement.elements.namedItem('startDate');
		const timezoneInput = formElement.elements.namedItem('timezoneOffset');
		if (dateInput instanceof HTMLInputElement && timezoneInput instanceof HTMLInputElement) {
			timezoneInput.value = String(new Date(`${dateInput.value}T00:00:00`).getTimezoneOffset());
		}
	}

	function formatCurrency(cents: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			cents / 100
		);
	}

	function formatDate(value: string) {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(value));
	}
</script>

<svelte:head>
	<title>Campaigns | Take the Lead</title>
	<meta name="description" content="Create a campaign or support a pet's care." />
</svelte:head>

<main class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 md:py-16">
	<header class="space-y-3">
		<p class="text-sm font-semibold tracking-wide text-primary uppercase">Take the Lead</p>
		<h1>Pet care campaigns</h1>
		<p class="max-w-2xl text-muted-foreground">
			Find a campaign to support or share a story to help a pet get the care they need.
		</p>
	</header>

	<section aria-label="Campaign totals" class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-lg border bg-card p-5">
			<p class="text-sm text-muted-foreground">Live campaigns</p>
			<p class="mt-1 text-2xl font-bold">{data.totals.liveCampaigns}</p>
		</div>
		<div class="rounded-lg border bg-card p-5">
			<p class="text-sm text-muted-foreground">Raised by live campaigns</p>
			<p class="mt-1 text-2xl font-bold">{formatCurrency(data.totals.raisedCents)}</p>
		</div>
		<div class="rounded-lg border bg-card p-5">
			<p class="text-sm text-muted-foreground">Simulated donations</p>
			<p class="mt-1 text-2xl font-bold">{data.totals.donations}</p>
		</div>
	</section>

	{#if data.user}
		<section class="rounded-xl border bg-card p-6">
			<h2 class="text-xl font-semibold">Start a campaign</h2>
			<p
				class="mt-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
				role="note"
			>
				You may have only one active campaign at a time. All campaigns must be set to start within
				48 hours from now.
			</p>
			<form method="POST" action="?/create" class="mt-5 grid gap-4" onsubmit={setStartTimezone}>
				<input type="hidden" name="timezoneOffset" value="0" />
				<label class="grid gap-2 text-sm font-medium">
					Campaign title
					<input
						class="rounded-md border bg-background px-3 py-2 font-normal"
						name="title"
						minlength="3"
						maxlength="120"
						required
					/>
				</label>
				<label class="grid gap-2 text-sm font-medium">
					Campaign story
					<textarea
						class="rounded-md border bg-background px-3 py-2 font-normal"
						name="summary"
						minlength="10"
						maxlength="5000"
						rows="5"
						required></textarea>
				</label>
				<label class="grid gap-2 text-sm font-medium sm:max-w-xs">
					Fundraising goal (USD)
					<input
						class="rounded-md border bg-background px-3 py-2 font-normal"
						name="goal"
						type="number"
						min="1"
						max="1000000"
						step="0.01"
						inputmode="decimal"
						required
					/>
				</label>
				<label class="grid gap-2 text-sm font-medium sm:max-w-xs">
					Start date
					<input
						class="rounded-md border bg-background px-3 py-2 font-normal"
						name="startDate"
						type="date"
						required
					/>
				</label>
				<p class="text-sm text-muted-foreground">
					Campaigns are reviewed before going live and run for 30 days from the selected start date.
				</p>
				{#if form?.createError}
					<p class="text-sm text-destructive" role="alert">{form.createError}</p>
				{/if}
				<button
					class="w-fit rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
					type="submit"
				>
					Save campaign
				</button>
			</form>
		</section>

		{#if data.myPendingCampaigns.length > 0}
			<section class="space-y-3">
				<h2 class="text-xl font-semibold">Your campaigns awaiting review</h2>
				<ul class="grid gap-3 md:grid-cols-2">
					{#each data.myPendingCampaigns as campaign (campaign.slug)}
						<li class="rounded-lg border bg-card p-4">
							<a
								class="font-semibold underline-offset-4 hover:underline"
								href={`/campaign/${campaign.slug}`}
							>
								{campaign.title}
							</a>
							<p class="mt-1 text-sm text-muted-foreground">
								Starts {campaign.startDate ? formatDate(campaign.startDate) : 'soon'} ·
								{campaign.ended ? 'ended before review' : 'pending review'}
							</p>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{:else}
		<section class="rounded-xl border bg-card p-6">
			<h2 class="text-xl font-semibold">Want to start a campaign?</h2>
			<p class="mt-2 text-muted-foreground">Sign in to share a campaign story.</p>
			<a
				class="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground"
				href="/demo/better-auth/login"
			>
				Sign in
			</a>
		</section>
	{/if}

	<section class="space-y-4">
		<h2 class="text-2xl font-semibold">Campaigns</h2>
		{#if data.campaigns.length === 0}
			<p class="rounded-lg border p-6 text-muted-foreground">There are no public campaigns yet.</p>
		{:else}
			<ul class="grid gap-4 md:grid-cols-2">
				{#each data.campaigns as campaign (campaign.id)}
					<li class="rounded-xl border bg-card p-5">
						<div class="flex items-start justify-between gap-3">
							<h3 class="text-lg font-semibold">
								<a class="underline-offset-4 hover:underline" href={`/campaign/${campaign.slug}`}>
									{campaign.title}
								</a>
							</h3>
							<span class="rounded-full border px-2.5 py-1 text-xs font-medium">
								{campaign.status === 'live' ? 'Live' : 'Ended'}
							</span>
						</div>
						<p class="mt-2 line-clamp-3 text-sm text-muted-foreground">{campaign.summary}</p>
						<p class="mt-3 text-sm text-muted-foreground">
							Started {formatDate(campaign.startDate)}
						</p>
						<div class="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
							<span>{formatCurrency(campaign.raisedCents)} raised</span>
							<span>{campaign.donorCount} donations</span>
							<span>Goal {formatCurrency(campaign.goalCents)}</span>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="space-y-4">
		<h2 class="text-2xl font-semibold">Recent donors</h2>
		{#if data.recentDonors.length === 0}
			<p class="text-muted-foreground">Recent supporter names will appear here after donations.</p>
		{:else}
			<ul class="divide-y rounded-lg border">
				{#each data.recentDonors as donor (donor.id)}
					<li class="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
						<span>
							<strong>{donor.name}</strong> supported
							<a class="underline underline-offset-4" href={`/campaign/${donor.slug}`}>
								{donor.campaignTitle}
							</a>
						</span>
						<span>{formatCurrency(donor.amountCents)} · {formatDate(donor.createdAt)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>
