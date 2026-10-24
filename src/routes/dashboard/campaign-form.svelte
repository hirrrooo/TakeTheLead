<script lang="ts">
	import { LoaderCircle, Rocket } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Field,
		FieldDescription,
		FieldError,
		FieldGroup,
		FieldLabel
	} from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import {
		Select,
		SelectContent,
		SelectGroup,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { causeOptions, type CampaignDraft } from '$lib/dashboard/campaigns';

	type Errors = Partial<Record<keyof CampaignDraft | 'goal', string>>;

	let {
		mode,
		initial,
		disabledCreate = false,
		onsubmit
	}: {
		mode: 'create' | 'edit';
		initial?: CampaignDraft;
		/** True when the user already has a running campaign. */
		disabledCreate?: boolean;
		onsubmit: (draft: CampaignDraft) => void | Promise<void>;
	} = $props();

	// Seeds once per mount — the parent remounts this form whenever it opens.
	// svelte-ignore state_referenced_locally
	const seed = initial;

	let name = $state(seed?.name ?? '');
	let cause = $state(seed?.cause ?? '');
	let summary = $state(seed?.summary ?? '');
	let goal = $state(seed ? String(seed.goalCents / 100) : '');
	let endDate = $state(seed?.endDate ?? '');

	let attempted = $state(false);
	let submitting = $state(false);

	const isSubmitting = $derived(submitting);
	const isEdit = $derived(mode === 'edit');

	// Lets <SelectValue> show the label for a pre-bound value before the menu mounts.
	const causeItems = causeOptions.map((option) => ({ value: option.value, label: option.label }));

	function computeErrors(): Errors {
		const next: Errors = {};
		if (name.trim().length < 3) next.name = 'Give your campaign a name (3+ characters).';
		if (!cause) next.cause = 'Pick the cause you’re raising for.';
		if (summary.trim().length < 10) next.summary = 'Add a sentence or two about your goal.';

		const goalDollars = Number(goal);
		if (!goal || !Number.isFinite(goalDollars) || goalDollars <= 0) {
			next.goal = 'Enter a fundraising goal greater than $0.';
		} else if (goalDollars > 1_000_000) {
			next.goal = 'That goal looks too high — keep it under $1,000,000.';
		}

		if (!endDate) {
			next.endDate = 'Choose an end date.';
		} else {
			const today = new Date().toISOString().slice(0, 10);
			if (endDate < today) next.endDate = 'The end date needs to be in the future.';
		}

		return next;
	}

	// Only surface messages after a submit attempt; recomputed so they clear as fields are fixed.
	const errors = $derived(attempted ? computeErrors() : {});

	function validate(): CampaignDraft | null {
		attempted = true;
		if (Object.keys(computeErrors()).length > 0) return null;

		return {
			name: name.trim(),
			cause,
			summary: summary.trim(),
			goalCents: Math.round(Number(goal) * 100),
			endDate
		};
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const draft = validate();
		if (!draft) return;
		submitting = true;
		try {
			await onsubmit(draft);
		} finally {
			submitting = false;
		}
	}
</script>

<form novalidate onsubmit={handleSubmit}>
	<FieldGroup>
		<Field data-invalid={errors.name ? 'true' : undefined}>
			<FieldLabel for="campaign-name">Campaign name</FieldLabel>
			<Input
				id="campaign-name"
				name="name"
				type="text"
				placeholder="Bella’s Vet Care Sprint"
				bind:value={name}
				aria-invalid={!!errors.name}
			/>
			<FieldError errors={errors.name ? [{ message: errors.name }] : []} />
		</Field>

		<div class="grid gap-5 sm:grid-cols-2">
			<Field data-invalid={errors.cause ? 'true' : undefined}>
				<FieldLabel for="campaign-cause">Cause</FieldLabel>
				<Select type="single" bind:value={cause} items={causeItems}>
					<SelectTrigger id="campaign-cause" name="cause">
						<SelectValue placeholder="Choose a cause" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{#each causeOptions as option (option.value)}
								<SelectItem value={option.value} label={option.label}>
									{option.label}
								</SelectItem>
							{/each}
						</SelectGroup>
					</SelectContent>
				</Select>
				<FieldError errors={errors.cause ? [{ message: errors.cause }] : []} />
			</Field>

			<Field data-invalid={errors.goal ? 'true' : undefined}>
				<FieldLabel for="campaign-goal">Fundraising goal</FieldLabel>
				<Input
					id="campaign-goal"
					name="goal"
					type="number"
					min="1"
					step="1"
					inputmode="decimal"
					placeholder="1500"
					bind:value={goal}
					aria-invalid={!!errors.goal}
				/>
				<FieldDescription>Amount in USD.</FieldDescription>
				<FieldError errors={errors.goal ? [{ message: errors.goal }] : []} />
			</Field>
		</div>

		<Field data-invalid={errors.endDate ? 'true' : undefined}>
			<FieldLabel for="campaign-end">End date</FieldLabel>
			<Input
				id="campaign-end"
				name="endDate"
				type="date"
				bind:value={endDate}
				aria-invalid={!!errors.endDate}
			/>
			<FieldError errors={errors.endDate ? [{ message: errors.endDate }] : []} />
		</Field>

		<Field data-invalid={errors.summary ? 'true' : undefined}>
			<FieldLabel for="campaign-summary">About this campaign</FieldLabel>
			<Textarea
				id="campaign-summary"
				name="summary"
				placeholder="Tell supporters what their donations will cover…"
				rows={4}
				bind:value={summary}
				aria-invalid={!!errors.summary}
			/>
			<FieldDescription>This shows on your public campaign page.</FieldDescription>
			<FieldError errors={errors.summary ? [{ message: errors.summary }] : []} />
		</Field>
	</FieldGroup>

	<p class="mt-4 text-sm text-muted-foreground" role="note">
		The full campaign builder is still in progress — this placeholder captures the basics.
	</p>

	<div class="mt-6 flex flex-col gap-3 sm:flex-row">
		<Button
			type="submit"
			class="w-full sm:w-auto"
			disabled={isSubmitting || (!isEdit && disabledCreate)}
		>
			{#if isSubmitting}
				<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
				Saving…
			{:else}
				<Rocket class="size-4" aria-hidden="true" />
				{isEdit ? 'Save changes' : 'Create campaign'}
			{/if}
		</Button>
	</div>
</form>
