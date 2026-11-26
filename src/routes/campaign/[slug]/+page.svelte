<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

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

	const percentage = $derived(
		data.campaign.goalCents > 0
			? Math.min(100, Math.round((data.campaign.raisedCents / data.campaign.goalCents) * 100))
			: 0
	);
</script>

<svelte:head>
	<title>{data.campaign.title} | Take the Lead</title>
	<meta name="description" content={data.campaign.summary} />
</svelte:head>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12 md:py-16">
	<a class="w-fit text-sm underline underline-offset-4" href={resolve('/campaign')}
		>← All campaigns</a
	>

	<article class="rounded-xl border bg-card p-6 md:p-8">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="space-y-2">
				<p class="text-sm text-muted-foreground">Campaign by {data.campaign.ownerName}</p>
				<h1>{data.campaign.title}</h1>
			</div>
			<span class="rounded-full border px-3 py-1 text-sm font-medium">
				{#if data.campaign.ended}
					Ended
				{:else if data.campaign.live}
					Live
				{:else if data.campaign.status === 'PENDING_REVIEW'}
					Pending review
				{:else}
					Upcoming
				{/if}
			</span>
		</div>

		<p class="mt-6 whitespace-pre-wrap text-muted-foreground">{data.campaign.summary}</p>

		<div class="mt-8 grid gap-4 sm:grid-cols-3">
			<div class="rounded-lg bg-muted/50 p-4">
				<p class="text-sm text-muted-foreground">Raised</p>
				<p class="mt-1 text-xl font-bold">{formatCurrency(data.campaign.raisedCents)}</p>
			</div>
			<div class="rounded-lg bg-muted/50 p-4">
				<p class="text-sm text-muted-foreground">Goal</p>
				<p class="mt-1 text-xl font-bold">{formatCurrency(data.campaign.goalCents)}</p>
			</div>
			<div class="rounded-lg bg-muted/50 p-4">
				<p class="text-sm text-muted-foreground">Donations</p>
				<p class="mt-1 text-xl font-bold">{data.campaign.donorCount}</p>
			</div>
		</div>

		<div class="mt-5 space-y-2">
			<div class="flex justify-between text-sm">
				<span>{percentage}% funded</span>
				<span>Ends {formatDate(data.campaign.endDate)}</span>
			</div>
			<div
				class="h-2 overflow-hidden rounded-full bg-muted"
				role="progressbar"
				aria-valuenow={percentage}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label="Campaign funding progress"
			>
				<div class="h-full rounded-full bg-primary" style:width="{percentage}%"></div>
			</div>
		</div>

		<p class="mt-4 text-sm text-muted-foreground">
			Starts {formatDate(data.campaign.startDate)} · runs for 30 days.
		</p>
	</article>

	{#if data.campaign.status === 'PENDING_REVIEW' && data.isOwner}
		<p class="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm" role="status">
			{data.campaign.ended
				? 'Your campaign’s 30-day window ended before approval. It cannot accept donations.'
				: 'Your campaign is saved and awaiting review. Donations open after it is approved and its start date arrives.'}
		</p>
	{/if}

	{#if form?.donationSuccess}
		<p class="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm" role="status">
			{form.donationSuccess}
		</p>
	{/if}

	{#if data.campaign.live}
		<section class="rounded-xl border bg-card p-6">
			<h2 class="text-xl font-semibold">Support this campaign</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				This development version records simulated donations only. No payment details are collected
				and no money is charged.
			</p>
			<form method="POST" action="?/donate" class="mt-5 grid gap-4 sm:grid-cols-2">
				<input type="hidden" name="campaignId" value={data.campaign.id} />
				<input type="hidden" name="idempotencyKey" value={data.donationKey} />
				<label class="grid gap-2 text-sm font-medium">
					Donation (USD)
					<input
						class="rounded-md border bg-background px-3 py-2 font-normal"
						name="amount"
						type="number"
						min="1"
						max="100000"
						step="0.01"
						inputmode="decimal"
						required
					/>
				</label>
				{#if !data.user}
					<label class="grid gap-2 text-sm font-medium">
						Your name (optional)
						<input
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="name"
							maxlength="100"
						/>
					</label>
				{/if}
				<label class="grid gap-2 text-sm font-medium sm:col-span-2">
					Message (optional)
					<textarea
						class="rounded-md border bg-background px-3 py-2 font-normal"
						name="message"
						maxlength="500"
						rows="3"></textarea>
				</label>
				<fieldset class="grid gap-2 text-sm sm:col-span-2">
					<legend class="font-medium">Who can see my message?</legend>
					<label class="flex items-center gap-2">
						<input type="radio" name="messageVisibility" value="public" checked />
						Everyone — shown on the campaign page
					</label>
					<label class="flex items-center gap-2">
						<input type="radio" name="messageVisibility" value="private" />
						Only the campaign owner
					</label>
					<span class="text-muted-foreground">Applies only if you write a message.</span>
				</fieldset>
				<label class="flex items-center gap-2 text-sm sm:col-span-2">
					<input type="checkbox" name="anonymous" />
					Show my donation as anonymous
				</label>
				{#if form?.donationError}
					<p class="text-sm text-destructive sm:col-span-2" role="alert">{form.donationError}</p>
				{/if}
				<button
					class="w-fit rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 sm:col-span-2"
					type="submit"
				>
					Record simulated donation
				</button>
			</form>
		</section>
	{:else}
		<p class="rounded-lg border p-4 text-sm text-muted-foreground" role="status">
			{data.campaign.ended
				? 'This campaign has ended and is no longer accepting donations.'
				: 'Donations will be available when this campaign is approved and reaches its start date.'}
		</p>
	{/if}

	<section class="space-y-4">
		<h2 class="text-2xl font-semibold">Recent donors</h2>
		{#if data.recentDonors.length === 0}
			<p class="text-muted-foreground">No completed donations yet.</p>
		{:else}
			<ul class="divide-y rounded-lg border">
				{#each data.recentDonors as donor (donor.id)}
					<li class="space-y-1 p-4 text-sm">
						<div class="flex items-center justify-between gap-3">
							<span>{donor.name}</span>
							<span class="text-muted-foreground">
								{formatCurrency(donor.amountCents)} · {formatDate(donor.createdAt)}
							</span>
						</div>
						{#if donor.message}
							<p class="whitespace-pre-wrap text-muted-foreground">“{donor.message}”</p>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>
