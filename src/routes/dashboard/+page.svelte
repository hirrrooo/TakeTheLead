<script lang="ts">
	import { PawPrint } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const now = Date.now();

	const greeting = $derived.by(() => {
		const hour = new Date(now).getHours();
		if (hour < 12) return 'Good morning';
		if (hour < 17) return 'Good afternoon';
		return 'Good evening';
	});
</script>

<svelte:head>
	<title>Dashboard | Take the Lead</title>
	<meta name="description" content="Your Take the Lead dashboard — welcome back." />
</svelte:head>

<main class="mx-auto w-full max-w-5xl px-6 py-14 md:py-20">
	<header class="flex flex-col items-start gap-4">
		<span
			class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
			aria-hidden="true"
		>
			<PawPrint class="size-6" />
		</span>
		<div class="space-y-1">
			<h1>{greeting}, {data.user.displayName}!</h1>
			<p class="max-w-xl text-balance text-muted-foreground">
				You’re signed in as
				<span class="font-medium text-foreground">@{data.user.username}</span>.
			</p>
		</div>
	</header>
</main>
