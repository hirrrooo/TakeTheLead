<script lang="ts">
	import {
		Banknote,
		CalendarDays,
		CircleCheck,
		PencilLine,
		Rocket,
		Target,
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
	import { Separator } from '$lib/components/ui/separator';
	import {
		causeLabel,
		daysRemaining,
		formatCurrency,
		formatDate,
		progressPercent,
		type Campaign
	} from '$lib/dashboard/campaigns';

	let {
		campaign,
		now,
		onedit,
		onpublish
	}: {
		campaign: Campaign;
		now: number;
		onedit: () => void;
		onpublish: () => void;
	} = $props();

	const percent = $derived(progressPercent(campaign));
	const remaining = $derived(daysRemaining(campaign.endDate, now));
	const isPublished = $derived(campaign.status === 'published');

	const stats = $derived([
		{
			key: 'raised',
			label: 'Raised',
			value: formatCurrency(campaign.raisedCents),
			icon: Banknote
		},
		{
			key: 'goal',
			label: 'Goal',
			value: formatCurrency(campaign.goalCents),
			icon: Target
		},
		{
			key: 'donors',
			label: 'Donors',
			value: String(campaign.donors),
			icon: Users
		},
		{
			key: 'ends',
			label: isPublished ? 'Days left' : 'Ends',
			value: isPublished ? `${remaining}` : formatDate(campaign.endDate),
			icon: CalendarDays
		}
	]);
</script>

<Card>
	<CardHeader>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="space-y-1">
				<div class="flex flex-wrap items-center gap-2">
					<CardTitle>{campaign.name}</CardTitle>
					<span
						class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium
							{isPublished
							? 'border-accent/40 bg-accent/10 text-accent'
							: 'border-ring/40 bg-secondary text-secondary-foreground'}"
					>
						{#if isPublished}
							<CircleCheck class="size-3" aria-hidden="true" />
						{/if}
						{isPublished ? 'Live' : 'Draft'}
					</span>
				</div>
				<CardDescription>
					{causeLabel(campaign.cause)} · started {formatDate(campaign.startDate)}
				</CardDescription>
			</div>

			{#if isPublished}
				<!-- Published campaigns stay editable. -->
				<Button variant="outline" size="sm" onclick={onedit}>
					<PencilLine aria-hidden="true" />
					Edit
				</Button>
			{:else}
				<div class="flex gap-2">
					<Button variant="outline" size="sm" onclick={onedit}>
						<PencilLine aria-hidden="true" />
						Edit
					</Button>
					<Button size="sm" onclick={onpublish}>
						<Rocket aria-hidden="true" />
						Publish
					</Button>
				</div>
			{/if}
		</div>
	</CardHeader>

	<CardContent class="space-y-5">
		<p class="text-sm text-muted-foreground">{campaign.summary}</p>

		<div class="space-y-2">
			<div class="flex items-baseline justify-between text-sm">
				<span class="font-medium">{percent}% funded</span>
				<span class="text-muted-foreground">
					{formatCurrency(campaign.raisedCents)} of {formatCurrency(campaign.goalCents)}
				</span>
			</div>
			<div
				class="h-2 w-full overflow-hidden rounded-full bg-muted"
				role="progressbar"
				aria-valuenow={percent}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label="Campaign funding progress"
			>
				<div
					class="h-full rounded-full bg-primary transition-[width] duration-500"
					style:width="{percent}%"
				></div>
			</div>
		</div>

		<Separator />

		<dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
			{#each stats as stat (stat.key)}
				<div class="flex flex-col gap-1">
					<dt class="flex items-center gap-1.5 text-xs text-muted-foreground">
						<stat.icon class="size-3.5 text-primary" aria-hidden="true" />
						{stat.label}
					</dt>
					<dd class="font-heading text-xl font-bold">{stat.value}</dd>
				</div>
			{/each}
		</dl>
	</CardContent>
</Card>
