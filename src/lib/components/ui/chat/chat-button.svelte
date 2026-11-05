<script lang="ts">
	import { tick } from 'svelte';
	import { MessageCircle, X } from '@lucide/svelte';
	import ChatWindow from './chat-window.svelte';

	let open = $state(false);
	let chat = $state<ChatWindow>();

	async function show() {
		open = true;
		await tick();
		chat?.focus();
	}
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && (open = false)} />

<!-- The panel stays mounted while hidden, so the conversation survives closing it and changing pages. -->
<section
	id="chat-panel"
	aria-label="Ask for help chat"
	hidden={!open}
	class="fixed inset-0 z-50 flex flex-col bg-background sm:inset-auto sm:right-6 sm:bottom-24 sm:h-[36rem] sm:max-h-[calc(100dvh-8rem)] sm:w-96 sm:overflow-hidden sm:rounded-xl sm:border sm:shadow-xl"
>
	<header class="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
		<h2 class="font-heading font-bold">Ask for help</h2>
		<button
			type="button"
			onclick={() => (open = false)}
			aria-label="Close chat"
			class="flex size-8 items-center justify-center rounded-full hover:bg-primary-foreground/15"
		>
			<X class="size-5" aria-hidden="true" />
		</button>
	</header>
	<div class="min-h-0 flex-1">
		<ChatWindow bind:this={chat} />
	</div>
</section>

<button
	type="button"
	onclick={() => (open ? (open = false) : show())}
	aria-expanded={open}
	aria-controls="chat-panel"
	class="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:right-6 sm:bottom-6"
>
	{#if open}
		<X class="size-5" aria-hidden="true" />
		Close
	{:else}
		<MessageCircle class="size-5" aria-hidden="true" />
		Ask for help
	{/if}
</button>
