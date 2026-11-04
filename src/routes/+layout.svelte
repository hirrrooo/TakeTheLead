<script lang="ts">
	import './layout.css';
	import { Footer } from '$lib/components/ui/footer';
	import { Header } from '$lib/components/ui/header';
	import { ChatButton } from '$lib/components/ui/chat';

	let { children, data } = $props();
</script>

<svelte:head><link rel="icon" href="/ttl-logo.svg" type="image/svg+xml" sizes="any" /></svelte:head>
<div class="flex min-h-dvh flex-col">
	<Header viewer={data.viewer} />
	<div class="flex-1">
		{@render children()}
	</div>
	<Footer />
</div>
<ChatButton />
