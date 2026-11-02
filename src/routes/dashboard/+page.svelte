<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let editing = $state(false);
	let dismissedEditError = $state(false);
	let editErrorVisible = $derived(Boolean(form?.editError) && !dismissedEditError);

	let billInput = $state<string | number>('');
	let ttlCoversInput = $state<string | number>('');
	let selectedHospitalId = $state('');
	let customHospitalName = $state('');
	let promiseAccepted = $state(false);

	$effect(() => {
		if (form?.createDraft) {
			billInput = form.createDraft.billAmount ?? '';
			ttlCoversInput = form.createDraft.ttlCoversAmount ?? '';
			selectedHospitalId = form.createDraft.vetHospitalId ?? '';
			customHospitalName = form.createDraft.hospitalName ?? '';
		}
	});

	function parsePreviewCents(raw: string | number | null | undefined): number | null {
		const normalized = String(raw ?? '').trim();
		if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) return null;
		const [dollars, cents = ''] = normalized.split('.');
		const amount = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
		return Number.isSafeInteger(amount) && amount >= 0 && amount <= 100_000_000 ? amount : null;
	}

	const billPreviewCents = $derived(parsePreviewCents(billInput) ?? 0);
	const ttlCoversPreviewCents = $derived.by(() => {
		if (!String(ttlCoversInput ?? '').trim()) return billPreviewCents;
		return parsePreviewCents(ttlCoversInput) ?? 0;
	});
	const ownerMaxPreviewCents = $derived(Math.max(0, billPreviewCents - ttlCoversPreviewCents));
	const selectedHospitalLabel = $derived.by(() => {
		if (selectedHospitalId === 'new') {
			return customHospitalName.trim() || 'your veterinary hospital';
		}
		const found = data.hospitals.find((h) => h.id === selectedHospitalId);
		return found?.name ?? 'your veterinary hospital';
	});

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
		<p class="text-sm font-semibold tracking-wide text-primary uppercase">Take The Lead</p>
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
			{:else if form.success === 'promise_accepted'}
				Promise to Pay terms accepted and recorded.
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
					{#if data.campaign.promiseToPay?.accepted}
						This campaign is awaiting moderation review before going live.
					{:else}
						This campaign cannot be published until you review and accept the Promise to Pay terms
						below.
					{/if}
				</p>
			{/if}

			{#if data.campaign.promiseToPay}
				<section
					class="space-y-4 rounded-xl border bg-muted/20 p-5"
					aria-labelledby="existing-promise-heading"
				>
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h3 id="existing-promise-heading" class="text-lg font-semibold">Promise to Pay</h3>
						<span class="rounded-full border px-2.5 py-0.5 text-xs font-medium">
							{data.campaign.promiseToPay.accepted ? 'Accepted' : 'Acceptance required'}
						</span>
					</div>
					<div class="grid gap-3 sm:grid-cols-3">
						<div class="rounded-lg border bg-background p-4">
							<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								Veterinary bill
							</p>
							<p class="mt-1 text-lg font-bold">
								{formatCurrency(data.campaign.promiseToPay.billAmountCents)}
							</p>
						</div>
						<div class="rounded-lg border bg-background p-4">
							<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								What TakeTheLead covers
							</p>
							<p class="mt-1 text-lg font-bold">
								{formatCurrency(data.campaign.promiseToPay.ttlCoversCents)}
							</p>
						</div>
						<div class="rounded-lg border bg-background p-4">
							<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								Maximum owner obligation
							</p>
							<p class="mt-1 text-lg font-bold">
								{formatCurrency(data.campaign.promiseToPay.ownerMaxObligationCents)}
							</p>
						</div>
					</div>
					<div class="space-y-2 text-sm text-muted-foreground">
						<p>
							<strong class="text-foreground">What TakeTheLead covers:</strong>
							{data.campaign.promiseToPay.ttlCoversText}
						</p>
						<p>
							<strong class="text-foreground">Maximum owner obligation:</strong>
							{data.campaign.promiseToPay.ownerObligationText}
						</p>
					</div>
					{#if !data.campaign.promiseToPay.accepted}
						<form method="POST" action="?/acceptPromise" class="space-y-4 border-t pt-4">
							<input type="hidden" name="campaignId" value={data.campaign.id} />
							<label class="flex items-start gap-3 rounded-lg border bg-background p-4 text-sm">
								<input class="mt-0.5 size-4" type="checkbox" name="promiseAccepted" required />
								<span>
									I understand the veterinary bill ({formatCurrency(
										data.campaign.promiseToPay.billAmountCents
									)}), what TakeTheLead covers ({formatCurrency(
										data.campaign.promiseToPay.ttlCoversCents
									)}), and my maximum owner obligation ({formatCurrency(
										data.campaign.promiseToPay.ownerMaxObligationCents
									)}).
								</span>
							</label>
							<button
								class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
								type="submit"
							>
								Accept Promise to Pay terms
							</button>
						</form>
					{/if}
				</section>
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
								value={form?.createDraft?.petName ?? ''}
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
								value={form?.createDraft?.petSpecies ?? ''}
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
							value={form?.createDraft?.petBreed ?? ''}
						/>
					</label>
					<label class="grid gap-2 text-sm font-medium">
						Veterinary hospital
						<select
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="vetHospitalId"
							bind:value={selectedHospitalId}
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
					{#if selectedHospitalId === 'new'}
						<div class="grid gap-4 sm:grid-cols-2">
							<label class="grid gap-2 text-sm font-medium">
								Hospital name
								<input
									class="rounded-md border bg-background px-3 py-2 font-normal"
									name="hospitalName"
									maxlength="160"
									bind:value={customHospitalName}
									required
								/>
							</label>
							<label class="grid gap-2 text-sm font-medium">
								Hospital city (optional)
								<input
									class="rounded-md border bg-background px-3 py-2 font-normal"
									name="hospitalCity"
									maxlength="100"
									value={form?.createDraft?.hospitalCity ?? ''}
								/>
							</label>
						</div>
					{/if}
					<div class="grid gap-4 sm:grid-cols-2">
						<label class="grid gap-2 text-sm font-medium">
							Veterinary bill (USD)
							<input
								class="rounded-md border bg-background px-3 py-2 font-normal"
								name="billAmount"
								type="number"
								min="0.01"
								max="1000000"
								step="0.01"
								inputmode="decimal"
								bind:value={billInput}
								required
							/>
						</label>
						<label class="grid gap-2 text-sm font-medium">
							What TakeTheLead covers (USD, optional)
							<input
								class="rounded-md border bg-background px-3 py-2 font-normal"
								name="ttlCoversAmount"
								type="number"
								min="0"
								max="1000000"
								step="0.01"
								inputmode="decimal"
								placeholder="Defaults to full veterinary bill"
								bind:value={ttlCoversInput}
							/>
							<span class="text-xs font-normal text-muted-foreground">
								Leave blank if fundraising covers the entire bill, or enter a lower cap.
							</span>
						</label>
					</div>
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
							value={form?.createDraft?.title ?? ''}
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
							required>{form?.createDraft?.summary ?? ''}</textarea
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
							required>{form?.createDraft?.story ?? ''}</textarea
						>
					</label>
					<label class="grid gap-2 text-sm font-medium">
						Campaign photo URL (optional, HTTPS)
						<input
							class="rounded-md border bg-background px-3 py-2 font-normal"
							name="coverImageUrl"
							type="url"
							value={form?.createDraft?.coverImageUrl ?? ''}
							placeholder="https://example.com/pet-photo.jpg"
						/>
					</label>
				</fieldset>

				<fieldset
					class="grid gap-4 rounded-xl border bg-muted/20 p-5"
					aria-labelledby="promise-to-pay-legend"
				>
					<legend id="promise-to-pay-legend" class="px-1 text-lg font-semibold">
						Promise to Pay — review before publishing
					</legend>
					<p class="text-sm text-muted-foreground">
						Before your campaign can be published, review this plain-language summary of the
						veterinary bill, what TakeTheLead covers, and the maximum amount you can still owe.
					</p>

					<div class="grid gap-3 sm:grid-cols-3">
						<div class="rounded-lg border bg-background p-4">
							<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								1. Veterinary bill
							</p>
							<p class="mt-1 text-xl font-bold" data-testid="ptp-bill-amount">
								{formatCurrency(billPreviewCents)}
							</p>
							<p class="mt-1 text-xs text-muted-foreground">
								Total invoice or estimate at {selectedHospitalLabel}.
							</p>
						</div>
						<div class="rounded-lg border bg-background p-4">
							<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								2. What TakeTheLead covers
							</p>
							<p class="mt-1 text-xl font-bold" data-testid="ptp-ttl-covers">
								{formatCurrency(ttlCoversPreviewCents)}
							</p>
							<p class="mt-1 text-xs text-muted-foreground">
								TakeTheLead pays {selectedHospitalLabel} directly as donations arrive, up to {formatCurrency(
									ttlCoversPreviewCents
								)}.
							</p>
						</div>
						<div class="rounded-lg border bg-background p-4">
							<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								3. Maximum owner obligation
							</p>
							<p class="mt-1 text-xl font-bold" data-testid="ptp-owner-max">
								{formatCurrency(ownerMaxPreviewCents)}
							</p>
							<p class="mt-1 text-xs text-muted-foreground">
								{#if ownerMaxPreviewCents === 0}
									You owe nothing ({formatCurrency(0)}) for this bill; TakeTheLead covers the full
									bill amount.
								{:else}
									You owe at most {formatCurrency(ownerMaxPreviewCents)} — the portion of the bill not
									covered by TakeTheLead.
								{/if}
							</p>
						</div>
					</div>

					<input
						type="hidden"
						name="ownerMaxAmount"
						value={(ownerMaxPreviewCents / 100).toFixed(2)}
					/>

					<label class="flex items-start gap-3 rounded-lg border bg-background p-4 text-sm">
						<input
							class="mt-0.5 size-4"
							type="checkbox"
							name="promiseAccepted"
							bind:checked={promiseAccepted}
							required
						/>
						<span>
							<strong>I understand</strong> the veterinary bill ({formatCurrency(
								billPreviewCents
							)}), what TakeTheLead covers ({formatCurrency(ttlCoversPreviewCents)}), and my maximum
							owner obligation ({formatCurrency(ownerMaxPreviewCents)}). I understand that my
							campaign cannot be published without accepting these terms.
						</span>
					</label>
				</fieldset>

				<button class="w-fit rounded-md bg-primary px-4 py-2 text-primary-foreground" type="submit">
					Create and publish campaign
				</button>
			</form>
		</section>
	{/if}
</main>
