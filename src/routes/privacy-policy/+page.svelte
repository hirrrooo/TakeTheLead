<script lang="ts">
	import { resolve } from '$app/paths';
	import { PawPrint } from '@lucide/svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

	const sections = [
		{
			title: 'Information we store',
			items: [
				'Account details, such as your name, email address, and password.',
				'Campaign details you provide, including information about your pet and veterinary records.',
				'Donation details, such as the amount, donor name, and any message you include.',
				'Session details used to keep you signed in, such as your IP address and browser type.'
			]
		},
		{
			title: 'How we use it',
			items: [
				'To run your account and keep you signed in.',
				'To publish, review, and manage fundraising campaigns.',
				'To record donations and show campaign progress.'
			]
		},
		{
			title: 'What others can see',
			items: [
				'Published campaigns are visible to visitors of the site.',
				'Donors can choose to give anonymously.'
			]
		}
	];
</script>

<svelte:head>
	<title>Privacy Policy | Take the Lead</title>
	<meta
		name="description"
		content="How Take the Lead stores and uses information from pet owners and donors."
	/>
</svelte:head>

<main class="mx-auto w-full max-w-3xl px-6 py-14 md:py-20">
	<header class="mb-10 flex flex-col items-center gap-3 text-center">
		<span
			class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
			aria-hidden="true"
		>
			<PawPrint class="size-6" />
		</span>
		<h1>Privacy Policy</h1>
		<p class="max-w-xl text-balance text-muted-foreground">
			This page explains what information Take the Lead stores and how we use it.
		</p>
		<p class="rounded-md bg-muted px-3 py-1 text-sm text-muted-foreground">
			Draft pending team review
		</p>
	</header>

	<div class="flex flex-col gap-6">
		{#each sections as section (section.title)}
			<Card>
				<CardHeader>
					<CardTitle>{section.title}</CardTitle>
				</CardHeader>
				<CardContent>
					<ul class="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
						{#each section.items as item (item)}
							<li>{item}</li>
						{/each}
					</ul>
				</CardContent>
			</Card>
		{/each}
	</div>

	<p class="mt-10 text-center text-sm text-muted-foreground">
		Questions about your information?
		<a
			href={resolve('/contact-us')}
			class="font-medium text-primary underline-offset-4 hover:underline">Contact us</a
		>.
	</p>
</main>
