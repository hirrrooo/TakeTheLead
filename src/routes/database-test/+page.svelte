<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/**
	 * Each action returns its own flash message under its own key, so a
	 * rejection in one form does not hide the result of another.
	 */
	const flashes = $derived((form ?? {}) as Record<string, unknown>);

	const banner = (result: unknown) => {
		if (!result || typeof result !== 'object' || !('title' in result)) return null;
		return result as { ok: boolean; kind: string; title: string; detail: string };
	};

	const donationFlash = $derived(banner(flashes.donation));
	const accessFlash = $derived(banner(flashes.access));
	const promiseFlash = $derived(banner(flashes.promise));
	const moderationFlash = $derived(banner(flashes.moderation));
	const recomputeFlash = $derived(banner(flashes.recompute));

	const money = (cents: number | null | undefined) =>
		cents === null || cents === undefined ? '—' : `$${(cents / 100).toFixed(2)}`;

	// Prefill the promise-to-pay form with a deliberately broken split so the
	// first click demonstrates the arithmetic guard, then let the user fix it.
	let promiseBill = $state('1000');
	let promiseTtl = $state('700');
	let promiseOwner = $state('250');

	function fillBalanced() {
		promiseTtl = '700';
		promiseOwner = String(Number(promiseBill) - 700);
	}
</script>

<svelte:head>
	<title>Database test · TakeTheLead</title>
</svelte:head>

<main class="mx-auto max-w-6xl space-y-10 p-6 text-sm leading-relaxed">
	<header class="space-y-2">
		<h1 class="text-2xl font-semibold">Database test</h1>
		<p class="max-w-3xl text-slate-600">
			Every TakeTheLead database interaction in one place, for templating and manual verification
			(TTL-208). Reads go straight to Prisma; <em>every write goes through the guarded helpers in</em>
			<code class="rounded bg-slate-100 px-1">src/lib/server/db/queries</code>, so the rejections below are
			the real rules the app will enforce. Nothing here is authenticated — pick the demo user each action
			runs as instead.
		</p>
		<p class="text-xs text-slate-500">
			Reset everything with <code class="rounded bg-slate-100 px-1">npm run db:reset</code>. Demo logins use
			the password in <code class="rounded bg-slate-100 px-1">prisma/seed-data.ts</code>.
		</p>
	</header>

	<!-- ================= Hospitals ================= -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold">1. Vet hospitals — ZIP search</h2>
		<p class="text-slate-600">
			The TTL-206 lookup: filter by ZIP prefix and species, always-open hospitals first. Try
			<code class="rounded bg-slate-100 px-1">234</code>, <code class="rounded bg-slate-100 px-1">23320</code>,
			or species <code class="rounded bg-slate-100 px-1">Exotics</code>.
		</p>

		<form method="get" class="flex flex-wrap items-end gap-3">
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">ZIP</span>
				<input
					name="zip"
					value={data.zip}
					placeholder="23456"
					class="w-32 rounded border border-slate-300 px-2 py-1"
				/>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Species</span>
				<input
					name="species"
					value={data.species}
					placeholder="Cats"
					class="w-32 rounded border border-slate-300 px-2 py-1"
				/>
			</label>
			<button
				class="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
			>Search</button>
			<a href="/database-test" class="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
				>Clear</a
			>
		</form>

		<p class="text-xs text-slate-500">{data.hospitals.length} matching hospitals.</p>

		<div class="overflow-x-auto rounded border border-slate-200">
			<table class="w-full text-left align-top">
				<thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
					<tr>
						<th class="p-2">Hospital</th>
						<th class="p-2">ZIP</th>
						<th class="p-2">Phone</th>
						<th class="p-2">Flags</th>
						<th class="p-2">Hours</th>
						<th class="p-2">Tier</th>
						<th class="p-2">Verified</th>
					</tr>
				</thead>
				<tbody>
					{#each data.hospitals as h (h.id)}
						<tr class="border-t border-slate-100">
							<td class="p-2">
								{#if h.website}
									<a class="text-blue-700 underline" href={h.website} rel="noopener" target="_blank"
										>{h.name}</a
									>
								{:else}
									{h.name}
								{/if}
								<div class="text-xs text-slate-500">{h.city} · {h.speciesServed}</div>
							</td>
							<td class="p-2 font-mono">{h.postalCode}</td>
							<td class="p-2 font-mono">{h.phone}</td>
							<td class="p-2">
								{#if h.is24Hour}<span class="mr-1 rounded bg-red-100 px-1 text-red-800">24/7</span>{/if}
								{#if h.isEmergency}<span class="mr-1 rounded bg-amber-100 px-1 text-amber-800">ER</span>{/if}
								{#if h.isLowCost}<span class="rounded bg-emerald-100 px-1 text-emerald-800">low-cost</span>{/if}
							</td>
							<td class="p-2 text-xs text-slate-600">{h.emergencyHours ?? '—'}</td>
							<td class="p-2">{h.priceTier}</td>
							<td class="p-2 text-xs">{h.isVerified ? `yes, ${h.verifiedAt}` : 'no'}</td>
						</tr>
					{:else}
						<tr>
							<td class="p-3 text-slate-500" colspan={7}>No hospitals match that ZIP or species.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- ================= Funding sources ================= -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold">2. Funding sources — verified directory</h2>
		<p class="text-slate-600">
			11 starter sources plus 4 added, each with <code class="rounded bg-slate-100 px-1">verifiedAt</code>
			set only after the link was actually loaded. Re-check them with
			<code class="rounded bg-slate-100 px-1">npm run db:check-links</code>.
		</p>

		<form method="get" class="flex flex-wrap items-end gap-3">
			<input type="hidden" name="zip" value={data.zip} />
			<input type="hidden" name="species" value={data.species} />
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Scope</span>
				<select name="scope" class="rounded border border-slate-300 px-2 py-1">
					<option value="" selected={data.scope === ''}>All</option>
					<option value="HAMPTON_ROADS" selected={data.scope === 'HAMPTON_ROADS'}>Hampton Roads</option>
					<option value="VIRGINIA" selected={data.scope === 'VIRGINIA'}>Virginia</option>
					<option value="NATIONAL" selected={data.scope === 'NATIONAL'}>National</option>
				</select>
			</label>
			<button class="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">Filter</button>
		</form>

		<p class="text-xs text-slate-500">{data.fundingSources.length} sources shown.</p>

		<ul class="grid gap-3 md:grid-cols-2">
			{#each data.fundingSources as f (f.id)}
				<li class="space-y-1 rounded border border-slate-200 p-3">
					<div class="flex items-start justify-between gap-2">
						<a class="font-medium text-blue-700 underline" href={f.url} rel="noopener" target="_blank"
							>{f.name}</a
						>
						<span class="whitespace-nowrap rounded bg-slate-100 px-1.5 text-xs">{f.scope}</span>
					</div>
					<div class="text-xs text-slate-500">
						{f.category} · {f.species} · cap: {f.maxAwardNote ?? 'no published cap'}
					</div>
					<div class="text-xs">
						{#if f.incomeRestricted}
							<span class="mr-1 rounded bg-indigo-100 px-1 text-indigo-800">income-limited</span>
						{/if}
						{#if f.isVerified}
							<span class="rounded bg-emerald-100 px-1 text-emerald-800"
								>verified {f.verifiedAt} · checked {f.lastCheckedAt}</span
							>
						{:else}
							<span class="rounded bg-slate-200 px-1">unverified</span>
						{/if}
					</div>
					{#if f.verifyNote}
						<p class="text-xs text-slate-500">{f.verifyNote}</p>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<!-- ================= Campaigns ================= -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold">3. Campaigns — state matrix</h2>
		<p class="text-slate-600">
			<code class="rounded bg-slate-100 px-1">raisedCents</code> is a cache; the value shown is read from the
			row, and section 7 proves it equals the sum of COMPLETED donations.
		</p>
		<div class="overflow-x-auto rounded border border-slate-200">
			<table class="w-full text-left">
				<thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
					<tr>
						<th class="p-2">Campaign</th>
						<th class="p-2">Status</th>
						<th class="p-2">Owner</th>
						<th class="p-2">Raised / goal</th>
						<th class="p-2">Donations</th>
						<th class="p-2">Promise</th>
						<th class="p-2">Guests</th>
					</tr>
				</thead>
				<tbody>
					{#each data.campaigns as c (c.id)}
						<tr class="border-t border-slate-100">
							<td class="p-2">
								<div class="font-medium">{c.title}</div>
								<div class="font-mono text-xs text-slate-500">{c.slug}</div>
							</td>
							<td class="p-2"><span class="rounded bg-slate-100 px-1.5">{c.status}</span></td>
							<td class="p-2 text-xs">
								{c.isOwnerAnonymous ? 'anonymous' : c.ownerName}
								<div class="text-slate-500">{c.hospital ?? 'no hospital'}</div>
							</td>
							<td class="p-2 font-mono">{money(c.raisedCents)} / {money(c.goalAmountCents)}</td>
							<td class="p-2">{c.donationCount}</td>
							<td class="p-2 text-xs">
								{#if c.promiseAccepted}
									<span class="rounded bg-emerald-100 px-1 text-emerald-800">accepted</span>
								{:else}
									<span class="rounded bg-rose-100 px-1 text-rose-800">not accepted</span>
								{/if}
							</td>
							<td class="p-2 text-xs">{c.allowGuestDonations ? 'allowed' : 'blocked'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- ================= Donations ================= -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold">4. Donations — write and transition</h2>
		<p class="text-slate-600">
			<code class="rounded bg-slate-100 px-1">recordDonation</code> refuses non-APPROVED campaigns and guest
			donations where they are not allowed, then recomputes the cache in the same transaction. Try donating
			to the PENDING_REVIEW campaign to see the refusal.
		</p>

		{#if donationFlash}
			<p
				class="rounded border p-2 {donationFlash.ok
					? 'border-emerald-300 bg-emerald-50 text-emerald-900'
					: 'border-rose-300 bg-rose-50 text-rose-900'}"
			>
				<strong>{donationFlash.title}.</strong> {donationFlash.detail}
			</p>
		{/if}

		<form
			method="post"
			action="?/donate"
			use:enhance
			class="grid gap-3 rounded border border-slate-200 p-3 md:grid-cols-4"
		>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Campaign</span>
				<select name="campaignId" class="w-full rounded border border-slate-300 px-2 py-1">
					{#each data.campaigns as c (c.id)}
						<option value={c.id}>{c.status} · {c.title}</option>
					{/each}
				</select>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Amount $</span>
				<input
					name="amount"
					value="25"
					inputmode="decimal"
					class="w-full rounded border border-slate-300 px-2 py-1"
				/>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Donor</span>
				<select name="donorMode" class="w-full rounded border border-slate-300 px-2 py-1">
					<option value="guest">Guest (starts PENDING)</option>
					<option value="user">Registered (starts COMPLETED)</option>
				</select>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Acting as</span>
				<select name="asUser" class="w-full rounded border border-slate-300 px-2 py-1">
					{#each data.actionUsers as u (u)}
						<option value={u}>{u}</option>
					{/each}
				</select>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Guest name</span>
				<input
					name="donorName"
					placeholder="Grace L."
					class="w-full rounded border border-slate-300 px-2 py-1"
				/>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Message</span>
				<input
					name="message"
					placeholder="optional"
					class="w-full rounded border border-slate-300 px-2 py-1"
				/>
			</label>
			<label class="flex items-center gap-2 self-end pb-1">
				<input type="checkbox" name="isAnonymous" class="rounded border-slate-300" />
				<span class="text-xs">Hide donor publicly</span>
			</label>
			<div class="self-end">
				<button class="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">
					Record donation
				</button>
			</div>
		</form>

		<div class="grid gap-4 md:grid-cols-2">
			<div class="space-y-2">
				<h3 class="font-medium">Status transition</h3>
				<form method="post" action="?/transition" use:enhance class="flex flex-wrap items-end gap-2">
					<label class="space-y-1">
						<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Donation</span>
						<select name="donationId" class="rounded border border-slate-300 px-2 py-1">
							{#each data.recentDonations as d (d.id)}
								<option value={d.id}>
									{d.status} · {money(d.amountCents)} · {d.slug}
								</option>
							{/each}
						</select>
					</label>
					<label class="space-y-1">
						<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">To</span>
						<select name="status" class="rounded border border-slate-300 px-2 py-1">
							{#each ['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED', 'CANCELLED'] as s (s)}
								<option value={s}>{s}</option>
							{/each}
						</select>
					</label>
					<button class="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">Apply</button>
				</form>
			</div>

			<div class="space-y-2">
				<h3 class="font-medium">Donations by status</h3>
				<table class="w-full text-left">
					<tbody>
						{#each data.donationStatuses as s (s.status)}
							<tr class="border-t border-slate-100">
								<td class="py-1">{s.status}</td>
								<td class="py-1 text-right font-mono">{s.count}</td>
								<td class="py-1 text-right font-mono">{money(s.totalCents)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</section>

	<!-- ================= Access control ================= -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold">5. Access control</h2>
		<p class="text-slate-600">
			<code class="rounded bg-slate-100 px-1">requireCampaignAccess</code> accepts ACCEPTED OWNER or MANAGER
			only. <code class="rounded bg-slate-100 px-1">requireCampaignOwner</code> is stricter — a co-manager
			fails. Try <code class="rounded bg-slate-100 px-1">seed_james</code> on “Bella Needs ACL Surgery”: he is
			a MANAGER, so access passes but ownership does not.
		</p>

		{#if accessFlash}
			<p
				class="rounded border p-2 {accessFlash.ok
					? 'border-emerald-300 bg-emerald-50 text-emerald-900'
					: 'border-rose-300 bg-rose-50 text-rose-900'}"
			>
				<strong>{accessFlash.title}.</strong> {accessFlash.detail}
			</p>
		{/if}

		<div class="grid gap-3 md:grid-cols-2">
			<form method="post" action="?/access" use:enhance class="flex flex-wrap items-end gap-2 rounded border border-slate-200 p-3">
				<label class="space-y-1">
					<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Campaign</span>
					<select name="campaignId" class="rounded border border-slate-300 px-2 py-1">
						{#each data.campaigns as c (c.id)}
							<option value={c.id}>{c.title}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-1">
					<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">User</span>
					<select name="asUser" class="rounded border border-slate-300 px-2 py-1">
						{#each data.actionUsers as u (u)}
							<option value={u}>{u}</option>
						{/each}
					</select>
				</label>
				<button class="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">
					requireCampaignAccess
				</button>
			</form>

			<form method="post" action="?/owner" use:enhance class="flex flex-wrap items-end gap-2 rounded border border-slate-200 p-3">
				<label class="space-y-1">
					<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Campaign</span>
					<select name="campaignId" class="rounded border border-slate-300 px-2 py-1">
						{#each data.campaigns as c (c.id)}
							<option value={c.id}>{c.title}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-1">
					<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">User</span>
					<select name="asUser" class="rounded border border-slate-300 px-2 py-1">
						{#each data.actionUsers as u (u)}
							<option value={u}>{u}</option>
						{/each}
					</select>
				</label>
				<button class="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">
					requireCampaignOwner
				</button>
			</form>
		</div>
	</section>

	<!-- ================= Promise to pay ================= -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold">6. Promise to pay and moderation (TTL-211)</h2>
		<p class="text-slate-600">
			Two invariants: the money must add up
			(<code class="rounded bg-slate-100 px-1">ttlCovers + ownerMax = bill</code>), and a campaign cannot be
			APPROVED until its owner has accepted the terms. The seeded “Ghost” campaign deliberately has an
			unaccepted promise — approve it as <code class="rounded bg-slate-100 px-1">seed_mod</code> and watch it
			get refused.
		</p>

		{#if promiseFlash}
			<p
				class="rounded border p-2 {promiseFlash.ok
					? 'border-emerald-300 bg-emerald-50 text-emerald-900'
					: 'border-rose-300 bg-rose-50 text-rose-900'}"
			>
				<strong>{promiseFlash.title}.</strong> {promiseFlash.detail}
			</p>
		{/if}

		<form
			method="post"
			action="?/promise"
			use:enhance
			class="grid gap-3 rounded border border-slate-200 p-3 md:grid-cols-4"
		>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Campaign</span>
				<select name="campaignId" class="w-full rounded border border-slate-300 px-2 py-1">
					{#each data.campaigns as c (c.id)}
						<option value={c.id}>{c.promiseAccepted ? '✓' : '✗'} {c.title}</option>
					{/each}
				</select>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Owner (must be OWNER)</span>
				<select name="asUser" class="w-full rounded border border-slate-300 px-2 py-1">
					{#each data.actionUsers as u (u)}
						<option value={u}>{u}</option>
					{/each}
				</select>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Bill $</span>
				<input
					bind:value={promiseBill}
					name="billAmount"
					inputmode="decimal"
					class="w-full rounded border border-slate-300 px-2 py-1"
				/>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">TakeTheLead covers $</span>
				<input
					bind:value={promiseTtl}
					name="ttlCovers"
					inputmode="decimal"
					class="w-full rounded border border-slate-300 px-2 py-1"
				/>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Owner owes at most $</span>
				<input
					bind:value={promiseOwner}
					name="ownerMax"
					inputmode="decimal"
					class="w-full rounded border border-slate-300 px-2 py-1"
				/>
			</label>
			<label class="space-y-1 md:col-span-3">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">
					Plain-language: what TakeTheLead pays
				</span>
				<input
					name="ttlCoversText"
					value="TakeTheLead pays the clinic directly as donations arrive."
					class="w-full rounded border border-slate-300 px-2 py-1"
				/>
			</label>
			<label class="space-y-1 md:col-span-3">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">
					Plain-language: what you owe
				</span>
				<input
					name="ownerObligationText"
					value="You owe whatever the fundraising does not reach."
					class="w-full rounded border border-slate-300 px-2 py-1"
				/>
			</label>
			<div class="flex items-end gap-2 md:col-span-4">
				<button class="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">
					acceptPromiseToPay
				</button>
				<button
					type="button"
					onclick={fillBalanced}
					class="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
				>
					Fix the arithmetic
				</button>
			</div>
		</form>

		{#if moderationFlash}
			<p
				class="rounded border p-2 {moderationFlash.ok
					? 'border-emerald-300 bg-emerald-50 text-emerald-900'
					: 'border-rose-300 bg-rose-50 text-rose-900'}"
			>
				<strong>{moderationFlash.title}.</strong> {moderationFlash.detail}
			</p>
		{/if}

		<form
			method="post"
			action="?/moderate"
			use:enhance
			class="grid gap-3 rounded border border-slate-200 p-3 md:grid-cols-4"
		>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Campaign</span>
				<select name="campaignId" class="w-full rounded border border-slate-300 px-2 py-1">
					{#each data.campaigns as c (c.id)}
						<option value={c.id}>{c.status} · {c.title}</option>
					{/each}
				</select>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Reviewer</span>
				<select name="asUser" class="w-full rounded border border-slate-300 px-2 py-1">
					{#each data.actionUsers as u (u)}
						<option value={u} selected={u === 'seed_mod'}>{u}</option>
					{/each}
				</select>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Decision</span>
				<select name="decision" class="w-full rounded border border-slate-300 px-2 py-1">
					{#each ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'] as d (d)}
						<option value={d}>{d}</option>
					{/each}
				</select>
			</label>
			<label class="space-y-1">
				<span class="block text-xs font-medium uppercase tracking-wide text-slate-500">Reason</span>
				<input
					name="reason"
					placeholder="optional"
					class="w-full rounded border border-slate-300 px-2 py-1"
				/>
			</label>
			<div class="md:col-span-4">
				<button class="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">
					moderateCampaign
				</button>
			</div>
		</form>
	</section>

	<!-- ================= Consistency ================= -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold">7. raisedCents consistency</h2>
		<p class="text-slate-600">
			The cache must always equal SUM(COMPLETED donations). If a row disagrees, something wrote around the
			query layer.
		</p>

		{#if recomputeFlash}
			<p
				class="rounded border p-2 {recomputeFlash.ok
					? 'border-emerald-300 bg-emerald-50 text-emerald-900'
					: 'border-rose-300 bg-rose-50 text-rose-900'}"
			>
				<strong>{recomputeFlash.title}.</strong> {recomputeFlash.detail}
			</p>
		{/if}

		<div class="overflow-x-auto rounded border border-slate-200">
			<table class="w-full text-left">
				<thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
					<tr>
						<th class="p-2">Campaign</th>
						<th class="p-2">Cached</th>
						<th class="p-2">SUM(COMPLETED)</th>
						<th class="p-2">Agrees</th>
					</tr>
				</thead>
				<tbody>
					{#each data.raisedCentsCheck.rows as r (r.id)}
						<tr class="border-t border-slate-100">
							<td class="p-2 font-mono text-xs">{r.slug}</td>
							<td class="p-2 font-mono">{money(r.cached)}</td>
							<td class="p-2 font-mono">{money(r.actual)}</td>
							<td class="p-2">
								{#if r.ok}
									<span class="rounded bg-emerald-100 px-1 text-emerald-800">ok</span>
								{:else}
									<span class="rounded bg-rose-100 px-1 text-rose-800">drift</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<form method="post" action="?/recompute" use:enhance>
			<button class="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">
				Recompute all caches
			</button>
		</form>
	</section>

	<!-- ================= Users ================= -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold">8. Demo users</h2>
		<table class="w-full text-left">
			<thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
				<tr>
					<th class="p-2">id</th>
					<th class="p-2">Name</th>
					<th class="p-2">Email</th>
					<th class="p-2">Moderator</th>
				</tr>
			</thead>
			<tbody>
				{#each data.users as u (u.id)}
					<tr class="border-t border-slate-100">
						<td class="p-2 font-mono text-xs">{u.id}</td>
						<td class="p-2">{u.name}</td>
						<td class="p-2 text-xs">{u.email}</td>
						<td class="p-2">{u.isModerator ? 'yes' : '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</main>
