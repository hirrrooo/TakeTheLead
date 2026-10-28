<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function formatCurrency(cents: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			cents / 100
		);
	}

	function formatDate(value: string) {
		return new Intl.DateTimeFormat('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(value));
	}
</script>

<svelte:head>
	<title>
		{data.withdrawn ? 'Campaign withdrawn' : `${data.campaign.title} | Take The Lead`}
	</title>
</svelte:head>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12 md:py-16">
	<a class="w-fit text-sm underline underline-offset-4" href={resolve('/campaign')}>
		← All campaigns
	</a>

	{#if data.withdrawn}
		<section class="space-y-3 rounded-xl border bg-card p-6 md:p-8">
			<h1>This campaign is no longer available</h1>
			<p class="text-muted-foreground">
				The campaign owner has withdrawn this fundraiser. Thank you for taking the time to support
				pets in need.
			</p>
			<a
				class="inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground"
				href={resolve('/campaign')}
			>
				Explore other campaigns
			</a>
		</section>
	{:else}
		<article class="overflow-hidden rounded-xl border bg-card">
			{#if data.campaign.coverImageUrl}
				<img
					class="max-h-[28rem] w-full object-cover"
					src={data.campaign.coverImageUrl}
					alt={`Photo for ${data.campaign.title}`}
				/>
			{/if}
			<div class="space-y-6 p-6 md:p-8">
				<header class="space-y-2">
					<div class="flex flex-wrap items-center gap-2">
						<h1>{data.campaign.title}</h1>
						<span class="rounded-full border px-2.5 py-1 text-xs font-medium">
							{data.campaign.status === 'PAUSED'
								? 'Temporarily paused'
								: data.campaign.status === 'CLOSED'
									? 'Ended'
									: 'Live'}
						</span>
					</div>
					<p class="text-sm text-muted-foreground">
						{#if data.campaign.pet}
							For {data.campaign.pet.name} · {data.campaign.pet.species} ·
						{/if}
						By {data.campaign.ownerFirstName}{data.campaign.city ? ` · ${data.campaign.city}` : ''}
					</p>
				</header>

				<p class="text-lg text-muted-foreground">{data.campaign.summary}</p>
				<p class="whitespace-pre-wrap">{data.campaign.story}</p>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="rounded-lg bg-muted/50 p-4">
						<p class="text-sm text-muted-foreground">Raised</p>
						<p class="mt-1 text-xl font-bold">{formatCurrency(data.campaign.raisedCents)}</p>
					</div>
					<div class="rounded-lg bg-muted/50 p-4">
						<p class="text-sm text-muted-foreground">Veterinary bill remaining</p>
						<p class="mt-1 text-xl font-bold">
							{formatCurrency(
								Math.max(0, data.campaign.billAmountCents - data.campaign.raisedCents)
							)}
						</p>
					</div>
				</div>

				<p class="text-sm text-muted-foreground">
					{#if data.campaign.status === 'PAUSED'}
						This campaign is temporarily paused.
					{:else if data.campaign.status === 'CLOSED'}
						This campaign ended {formatDate(data.campaign.endDate)}.
					{:else}
						This campaign runs through {formatDate(data.campaign.endDate)}.
					{/if}
				</p>
			</div>
		</article>
	{/if}
</main>
