<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href="/ttl-logo.svg" type="image/svg+xml" sizes="any" /></svelte:head>
{@render children()}
