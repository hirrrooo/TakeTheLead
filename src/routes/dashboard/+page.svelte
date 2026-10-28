<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let editing = $state(false);
	let dismissedEditError = $state(false);
	let editErrorVisible = $derived(Boolean(form?.editError) && !dismissedEditError);

	function openEdit() {
		editing = true;
		dismissedEditError = false;
	}

	function closeEdit() {
		editing = false;
		dismissedEditError = true;
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

	function confirmWithdrawal(event: SubmitEvent) {
		if (!window.confirm('Withdraw this campaign? It will disappear from campaign browsing.')) {
			event.preventDefault();
		}
	}
</script>

<svelte:head>
	<title>Dashboard | Take The Lead</title>
	<meta name="description" content="Manage your Take The Lead pet-care campaign." />
</svelte:head>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 md:py-16">
	<header class="space-y-3">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<p class="text-sm font-semibold tracking-wide text-primary uppercase">Take The Lead</p>
			<form method="post" action="?/signOut" use:enhance>
				<button
					class="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
					type="submit"
				>
					Sign out
				</button>
			</form>
		</div>
		<h1>Welcome, {data.user.name}</h1>
		<p class="text-muted-foreground">
			Manage your pet's care campaign and keep supporters updated.
		</p>
	</header>

	{#if form?.error}
		<p
			class="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
			role="alert"
		>
			{form.error}
		</p>
	{/if}

	{#if form?.success}
		<p class="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm" role="status">
			{#if form.success === 'published'}
				Campaign published and live. Supporters can now view it.
			{:else if form.success === 'updated'}
				Campaign changes saved and are visible on its public page.
			{:else if form.success === 'paused'}
				Campaign paused. Donations are temporarily stopped.
			{:else if form.success === 'resumed'}
				Campaign resumed.
			{:else if form.success === 'withdrawn'}
				Campaign withdrawn. It is no longer listed for browsing.
			{/if}
		</p>
	{/if}

	{#if data.campaign}
		<section
			class="space-y-6 rounded-xl border bg-card p-6 md:p-8"
			aria-labelledby="campaign-heading"
		>
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div class="space-y-2">
					<p class="text-sm font-medium text-muted-foreground">
						{data.campaign.status === 'APPROVED'
							? 'LIVE'
							: data.campaign.status.replaceAll('_', ' ')}
					</p>
					<h2 id="campaign-heading" class="text-2xl font-semibold">{data.campaign.title}</h2>
					<p class="text-sm text-muted-foreground">
						{data.campaign.pet?.name ?? 'Pet'} · {data.campaign.hospital?.name ??
							'Veterinary hospital'}
						{#if data.campaign.hospital?.city}
							· {data.campaign.hospital.city}
						{/if}
					</p>
				</div>
				<div class="flex flex-wrap gap-2">
					{#if data.campaign.status === 'APPROVED' || data.campaign.status === 'PAUSED'}
						<a
							class="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
							href={resolve('/campaign/[slug]', { slug: data.campaign.slug })}
						>
							View public page
						</a>
					{/if}
					{#if !editing}
						<button
							class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
							type="button"
							onclick={openEdit}
						>
							Edit campaign
						</button>
					{/if}
				</div>
			</div>

			{#if data.campaign.coverImageUrl}
				<img
					class="max-h-80 w-full rounded-lg object-cover"
					src={data.campaign.coverImageUrl}
					alt={`Photo for ${data.campaign.title}`}
				/>
			{/if}

			<p class="whitespace-pre-wrap text-muted-foreground">{data.campaign.summary}</p>

			{#if data.campaign.status === 'APPROVED' || data.campaign.status === 'PAUSED'}
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div class="rounded-lg bg-muted/50 p-4">
						<p class="text-sm text-muted-foreground">Raised</p>
						<p class="mt-1 text-xl font-bold">{formatCurrency(data.campaign.raisedCents)}</p>
					</div>
					<div class="rounded-lg bg-muted/50 p-4">
						<p class="text-sm text-muted-foreground">Days left</p>
						<p class="mt-1 text-xl font-bold">{data.campaign.daysLeft ?? '—'}</p>
					</div>
					<div class="rounded-lg bg-muted/50 p-4">
						<p class="text-sm text-muted-foreground">Donors</p>
						<p class="mt-1 text-xl font-bold">{data.campaign.donorCount}</p>
					</div>
					<div class="rounded-lg bg-muted/50 p-4">
						<p class="text-sm text-muted-foreground">Remaining bill</p>
						<p class="mt-1 text-xl font-bold">
							{formatCurrency(
								Math.max(0, data.campaign.billAmountCents - data.campaign.raisedCents)
							)}
						</p>
					</div>
				</div>
			{:else}
				<p class="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm" role="status">
					This campaign is live and visible to supporters.
				</p>
			{/if}

			{#if editing || editErrorVisible}
				<form method="POST" action="?/update" class="grid gap-4 border-t pt-6">
					<input type="hidden" name="campaignId" value={data.campaign.id} />
					{#if editErrorVisible}
						<p class="text-sm text-destructive" role="alert">{form?.editError}</p>
					{/if}
					<label class="grid gap-2 text-sm font-medium">
						Title
						<input
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="title"
							minlength="3"
							maxlength="120"
							value={form?.editDraft?.title ?? data.campaign.title}
							required
						/>
					</label>
					<label class="grid gap-2 text-sm font-medium">
						Short description
						<textarea
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="summary"
							minlength="10"
							maxlength="300"
							rows="2"
							required>{form?.editDraft?.summary ?? data.campaign.summary}</textarea
						>
					</label>
					<label class="grid gap-2 text-sm font-medium">
						Campaign story
						<textarea
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="story"
							minlength="20"
							maxlength="5000"
							rows="5"
							required>{form?.editDraft?.story ?? data.campaign.story}</textarea
						>
					</label>
					<label class="grid gap-2 text-sm font-medium">
						Campaign photo URL (HTTPS)
						<input
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="coverImageUrl"
							type="url"
							value={form?.editDraft?.coverImageUrl ?? data.campaign.coverImageUrl ?? ''}
							placeholder="https://example.com/pet-photo.jpg"
						/>
					</label>
					<div class="flex flex-wrap gap-3">
						<button class="rounded-md bg-primary px-4 py-2 text-primary-foreground" type="submit">
							Save changes
						</button>
						<button class="rounded-md border px-4 py-2" type="button" onclick={closeEdit}>
							Cancel
						</button>
					</div>
				</form>
			{/if}

			{#if data.campaign.status === 'APPROVED'}
				<form method="POST" action="?/pause">
					<input type="hidden" name="campaignId" value={data.campaign.id} />
					<button class="rounded-md border px-4 py-2 text-sm hover:bg-muted" type="submit">
						Pause campaign
					</button>
				</form>
			{:else if data.campaign.status === 'PAUSED'}
				<form method="POST" action="?/resume">
					<input type="hidden" name="campaignId" value={data.campaign.id} />
					<button class="rounded-md border px-4 py-2 text-sm hover:bg-muted" type="submit">
						Resume campaign
					</button>
				</form>
			{/if}

			{#if data.campaign.messages.length > 0}
				<section class="space-y-3 border-t pt-6" aria-labelledby="recent-messages-heading">
					<h3 id="recent-messages-heading" class="text-lg font-semibold">Recent messages</h3>
					<ul class="divide-y rounded-lg border">
						{#each data.campaign.messages as message (message.id)}
							<li class="space-y-1 p-4">
								<p>{message.text}</p>
								<p class="text-sm text-muted-foreground">
									{message.donor} · {formatCurrency(message.amountCents)} · {formatDate(
										message.createdAt
									)}
								</p>
							</li>
						{/each}
					</ul>
				</section>
			{:else if data.campaign.status === 'APPROVED' || data.campaign.status === 'PAUSED'}
				<section class="space-y-2 border-t pt-6">
					<h3 class="text-lg font-semibold">Recent messages</h3>
					<p class="text-sm text-muted-foreground">
						Supporter notes will appear here as donations arrive.
					</p>
				</section>
			{/if}

			<form method="POST" action="?/withdraw" onsubmit={confirmWithdrawal}>
				<input type="hidden" name="campaignId" value={data.campaign.id} />
				<button class="text-sm text-destructive underline underline-offset-4" type="submit">
					Withdraw campaign
				</button>
			</form>
		</section>

		<section class="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
			Saved funding sources and end-of-campaign summaries will be added later.
		</section>
	{:else}
		<section class="rounded-xl border bg-card p-6 md:p-8">
			<h2 class="text-2xl font-semibold">Start a campaign for your pet</h2>
			<p class="mt-2 text-muted-foreground">
				Share the care they need, the veterinary hospital, and the bill supporters can help with.
			</p>

			<form method="POST" action="?/create" class="mt-6 grid gap-5">
				<fieldset class="grid gap-4">
					<legend class="text-lg font-semibold">Pet and veterinary care</legend>
					<div class="grid gap-4 sm:grid-cols-2">
						<label class="grid gap-2 text-sm font-medium">
							Pet name
							<input
								class="rounded-md border bg-background px-3 py-2 font-normal"
								name="petName"
								maxlength="80"
								required
							/>
						</label>
						<label class="grid gap-2 text-sm font-medium">
							Species
							<input
								class="rounded-md border bg-background px-3 py-2 font-normal"
								name="petSpecies"
								maxlength="40"
								placeholder="Dog, cat, etc."
								required
							/>
						</label>
					</div>
					<label class="grid gap-2 text-sm font-medium">
						Breed (optional)
						<input
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="petBreed"
							maxlength="80"
						/>
					</label>
					<label class="grid gap-2 text-sm font-medium">
						Veterinary hospital
						<select
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="vetHospitalId"
							required
						>
							<option value="">Choose a hospital</option>
							{#each data.hospitals as hospital (hospital.id)}
								<option value={hospital.id}>
									{hospital.name}{hospital.city ? ` · ${hospital.city}` : ''}
								</option>
							{/each}
							<option value="new">Add a hospital</option>
						</select>
						<span class="text-sm text-muted-foreground">
							Choose an existing hospital or add one. New listings are unverified until reviewed.
						</span>
					</label>
					<label class="grid gap-2 text-sm font-medium">
						Hospital name (required when adding a hospital)
						<input
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="hospitalName"
							maxlength="160"
						/>
					</label>
					<label class="grid gap-2 text-sm font-medium">
						Hospital city (optional)
						<input
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="hospitalCity"
							maxlength="100"
						/>
					</label>
					<label class="grid gap-2 text-sm font-medium sm:max-w-xs">
						Veterinary bill (USD)
						<input
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="billAmount"
							type="number"
							min="0.01"
							max="1000000"
							step="0.01"
							inputmode="decimal"
							required
						/>
					</label>
				</fieldset>

				<fieldset class="grid gap-4 border-t pt-5">
					<legend class="text-lg font-semibold">Campaign information</legend>
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
						Short description
						<textarea
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="summary"
							minlength="10"
							maxlength="300"
							rows="2"
							required></textarea>
					</label>
					<label class="grid gap-2 text-sm font-medium">
						Campaign story
						<textarea
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="story"
							minlength="20"
							maxlength="5000"
							rows="5"
							required></textarea>
					</label>
					<label class="grid gap-2 text-sm font-medium">
						Campaign photo URL (optional, HTTPS)
						<input
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="coverImageUrl"
							type="url"
							placeholder="https://example.com/pet-photo.jpg"
						/>
					</label>
				</fieldset>

				<button class="w-fit rounded-md bg-primary px-4 py-2 text-primary-foreground" type="submit">
					Create and publish campaign
				</button>
			</form>
		</section>
	{/if}
</main>
