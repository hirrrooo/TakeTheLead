<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function formatCurrency(cents: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			cents / 100
		);
	}
</script>

<svelte:head>
	<title>Pet care campaigns | Take The Lead</title>
	<meta name="description" content="Support pets and their families with veterinary care." />
</svelte:head>

<main class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 md:py-16">
	<header class="space-y-3">
		<p class="text-sm font-semibold tracking-wide text-primary uppercase">Take The Lead</p>
		<h1>Pet care campaigns</h1>
		<p class="max-w-2xl text-muted-foreground">Help pets get the veterinary care they need.</p>
	</header>

	{#if data.campaigns.length === 0}
		<p class="rounded-lg border p-6 text-muted-foreground">
			There are no public campaigns right now.
		</p>
	{:else}
		<ul class="grid gap-5 md:grid-cols-2">
			{#each data.campaigns as campaign (campaign.slug)}
				<li class="overflow-hidden rounded-xl border bg-card">
					{#if campaign.coverImageUrl}
						<img class="h-56 w-full object-cover" src={campaign.coverImageUrl} alt="" />
					{/if}
					<div class="space-y-4 p-5">
						<div class="space-y-1">
							<div class="flex items-start justify-between gap-3">
								<h2 class="text-xl font-semibold">
									<a
										class="underline-offset-4 hover:underline"
										href={resolve('/campaign/[slug]', { slug: campaign.slug })}
									>
										{campaign.title}
									</a>
								</h2>
								{#if campaign.status === 'PAUSED'}
									<span class="rounded-full border px-2 py-1 text-xs">Paused</span>
								{/if}
							</div>
							<p class="text-sm text-muted-foreground">
								By {campaign.ownerFirstName}{campaign.city ? ` · ${campaign.city}` : ''}
							</p>
						</div>
						<p class="line-clamp-3 text-sm text-muted-foreground">{campaign.summary}</p>
						<div class="flex flex-wrap gap-x-5 gap-y-1 text-sm">
							<span>{formatCurrency(campaign.raisedCents)} raised</span>
							<span>
								{formatCurrency(Math.max(0, campaign.billAmountCents - campaign.raisedCents))} bill remaining
							</span>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</main>
