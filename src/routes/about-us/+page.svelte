<script lang="ts">
	import { resolve } from '$app/paths';
	import { HeartHandshake, PawPrint, Users } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
</script>

<svelte:head>
	<title>About Us | Take the Lead</title>
	<meta
		name="description"
		content="Take the Lead is a nonprofit that helps pet owners cover urgent vet bills with 30-day community fundraising campaigns."
	/>
</svelte:head>

<main class="mx-auto w-full max-w-5xl px-6 py-14 md:py-20">
	<header class="mb-10 flex flex-col items-center gap-3 text-center md:mb-14">
		<span
			class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
			aria-hidden="true"
		>
			<PawPrint class="size-6" />
		</span>
		<h1>About Us</h1>
		<p class="max-w-xl text-balance text-muted-foreground">
			Take the Lead is a nonprofit that removes the barrier between pet owners and urgent veterinary
			care.
		</p>
	</header>

	<div class="grid gap-6 md:grid-cols-2">
		<Card>
			<CardHeader>
				<HeartHandshake class="size-6 text-primary" aria-hidden="true" />
				<CardTitle>What we do</CardTitle>
			</CardHeader>
			<CardContent>
				<CardDescription>
					When a pet needs urgent care, the bill shouldn’t stand in the way. Pet owners can start a
					30-day fundraising campaign to help cover the cost.
				</CardDescription>
			</CardContent>
		</Card>
		<Card>
			<CardHeader>
				<Users class="size-6 text-primary" aria-hidden="true" />
				<CardTitle>Powered by community</CardTitle>
			</CardHeader>
			<CardContent>
				<CardDescription>
					Friends, family, and neighbors can rally behind a pet in need. Every stride counts.
				</CardDescription>
			</CardContent>
		</Card>
	</div>

	<div class="mt-10 flex flex-wrap justify-center gap-3">
		<Button href={resolve('/campaign')}>Browse campaigns</Button>
		<Button variant="outline" href={resolve('/contact-us')}>Contact us</Button>
	</div>
</main>
