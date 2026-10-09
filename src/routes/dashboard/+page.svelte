<script lang="ts">
	import { CircleCheck, PawPrint, Plus, Sparkles } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import CampaignCard from './campaign-card.svelte';
	import CampaignForm from './campaign-form.svelte';
	import {
		createCampaign,
		updateCampaign,
		type Campaign,
		type CampaignDraft
	} from '$lib/dashboard/campaigns';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const now = Date.now();

	/** Local edits shadow the loaded campaign until the page reloads. */
	let override = $state<Campaign | null | undefined>(undefined);
	const campaign = $derived(override === undefined ? data.campaign : override);

	let formOpen = $state(false);
	let notice = $state<'saved' | 'published' | null>(null);

	/** A user may only run one campaign at a time. */
	const hasRunningCampaign = $derived(campaign !== null);

	const greeting = $derived.by(() => {
		const hour = new Date(now).getHours();
		if (hour < 12) return 'Good morning';
		if (hour < 17) return 'Good afternoon';
		return 'Good evening';
	});

	function openCreate() {
		notice = null;
		formOpen = true;
	}

	function openEdit() {
		notice = null;
		formOpen = true;
	}

	function closeForm() {
		formOpen = false;
	}

	function handleCreate(draft: CampaignDraft) {
		// Guard the one-campaign rule client-side until it lives in the database.
		if (hasRunningCampaign) return;
		override = createCampaign(draft);
		formOpen = false;
		notice = 'saved';
	}

	function handleEdit(draft: CampaignDraft) {
		if (!campaign) return;
		override = updateCampaign(campaign, draft);
		formOpen = false;
		notice = 'saved';
	}

	function handlePublish() {
		if (!campaign) return;
		override = { ...campaign, status: 'published' };
		notice = 'published';
	}
</script>

<svelte:head>
	<title>Dashboard | Take the Lead</title>
	<meta
		name="description"
		content="Your Take the Lead dashboard — welcome back, check your campaign progress, and launch your next fundraiser."
	/>
</svelte:head>

<main class="mx-auto w-full max-w-5xl px-6 py-14 md:py-20">
	<header class="mb-10 flex flex-col items-start gap-4 md:mb-14">
		<span
			class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
			aria-hidden="true"
		>
			<PawPrint class="size-6" />
		</span>
		<div class="space-y-1">
			<h1>{greeting}, {data.user.displayName}!</h1>
			<p class="max-w-xl text-balance text-muted-foreground">
				{#if hasRunningCampaign}
					Here’s how <span class="font-medium text-foreground">{campaign?.name}</span> is doing.
					You’re signed in as
					<span class="font-medium text-foreground">@{data.user.username}</span>.
				{:else}
					You’re signed in as <span class="font-medium text-foreground">@{data.user.username}</span
					>. Ready to rally a pack for the pets you love? Launch your first campaign below.
				{/if}
			</p>
		</div>
	</header>

	{#if notice && !formOpen}
		<p
			class="mb-6 flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent"
			role="status"
		>
			<CircleCheck class="size-4 shrink-0" aria-hidden="true" />
			{notice === 'published' ? 'Campaign published — best of luck!' : 'Campaign saved.'}
		</p>
	{/if}

	<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-8">
		<div class="flex flex-col gap-6">
			{#if campaign}
				<CampaignCard {campaign} {now} onedit={openEdit} onpublish={handlePublish} />
			{:else}
				<Card>
					<CardHeader>
						<CardTitle>No campaign running yet</CardTitle>
						<CardDescription>
							Pick a cause, set a goal, and rally friends, family, or coworkers to sponsor your
							team. Every donation goes straight to the shelter or rescue you chose.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onclick={openCreate} disabled={formOpen}>
							<Plus aria-hidden="true" />
							Create a campaign
						</Button>
					</CardContent>
				</Card>
			{/if}

			{#if formOpen}
				<Card>
					<CardHeader>
						<CardTitle>{campaign ? 'Edit your campaign' : 'Start a campaign'}</CardTitle>
						<CardDescription>
							{campaign
								? 'Update the details of your running campaign.'
								: 'Tell us about the fundraiser you want to run.'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{#if campaign}
							<CampaignForm
								mode="edit"
								initial={{
									name: campaign.name,
									cause: campaign.cause,
									summary: campaign.summary,
									goalCents: campaign.goalCents,
									endDate: campaign.endDate
								}}
								onsubmit={handleEdit}
							/>
						{:else}
							<CampaignForm
								mode="create"
								disabledCreate={hasRunningCampaign}
								onsubmit={handleCreate}
							/>
						{/if}
						<Button variant="ghost" class="mt-3" onclick={closeForm}>Cancel</Button>
					</CardContent>
				</Card>
			{/if}
		</div>

		<aside class="flex flex-col gap-6" aria-label="Campaign tips">
			<Card>
				<CardHeader>
					<CardTitle>One campaign at a time</CardTitle>
					<CardDescription>
						Each supporter runs a single live campaign, so all of your supporters’ attention lands
						on one goal.
					</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-col gap-3 text-sm">
					<p class="text-muted-foreground">
						{#if hasRunningCampaign}
							You have a campaign running, so starting another is turned off. Edit the one above to
							change its name, goal, or end date.
						{:else}
							Once yours is live, this is where you’ll track donations and make changes.
						{/if}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Sparkles class="size-4 text-primary" aria-hidden="true" />
						Tips that raise more
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ul class="flex list-disc flex-col gap-2 pl-4 text-sm text-muted-foreground">
						<li>Name your campaign after the pet you’re raising for — people donate to stories.</li>
						<li>Share your progress bar weekly; updates bring supporters back.</li>
						<li>Set a goal you can picture reaching by the end date.</li>
					</ul>
				</CardContent>
			</Card>
		</aside>
	</div>
</main>
