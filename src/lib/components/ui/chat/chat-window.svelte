<script lang="ts">
	import { tick } from 'svelte';
	import { CircleAlert, ExternalLink, HandCoins, HeartPulse, SendHorizontal } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';

	type Question = { id: string; text: string; urgency: string };
	type Source = {
		number: number;
		id: string;
		name: string;
		url: string;
		category: string;
		mustRepay: boolean;
		verified: boolean;
	};
	type Message =
		| { id: number; from: 'owner'; text: string }
		| {
				id: number;
				from: 'bot';
				text: string;
				emergency?: boolean;
				label?: string;
				sources?: Source[];
				aiUsed?: boolean;
				error?: boolean;
		  };

	let nextId = 1;
	let messages = $state<Message[]>([
		{
			id: 0,
			from: 'bot',
			text: 'Hi! I can help you find ways to pay for vet care, or help you decide how soon your pet should see a vet. What do you need?'
		}
	]);
	let draft = $state('');
	let busy = $state(false);
	let input = $state<HTMLTextAreaElement | null>(null);
	let scroller = $state<HTMLElement>();

	// "My pet isn't well" walks through the checklist one question at a time.
	let questions = $state<Question[]>([]);
	let step = $state<number | null>(null);
	let answers: Record<string, boolean> = {};

	const started = $derived(messages.some((m) => m.from === 'owner'));
	const current = $derived(step === null ? null : questions[step]);

	export function focus() {
		input?.focus();
	}

	function say(text: string) {
		messages.push({ id: nextId++, from: 'owner', text });
	}

	async function scrollDown() {
		await tick();
		scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
	}

	async function ask(body: { message: string; answers?: Record<string, boolean> }) {
		busy = true;
		scrollDown();
		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			const data = await res.json().catch(() => null);
			if (!res.ok) {
				messages.push({
					id: nextId++,
					from: 'bot',
					error: true,
					text: data?.message ?? 'Sorry, something went wrong. Please try again.'
				});
			} else if (data.kind === 'emergency') {
				messages.push({
					id: nextId++,
					from: 'bot',
					emergency: true,
					label: data.label,
					text: data.reply
				});
			} else {
				messages.push({
					id: nextId++,
					from: 'bot',
					label: data.label,
					text: data.reply,
					sources: data.sources,
					aiUsed: data.aiUsed
				});
			}
		} catch {
			messages.push({
				id: nextId++,
				from: 'bot',
				error: true,
				text: 'I could not reach the server. Check your connection and try again.'
			});
		} finally {
			busy = false;
			scrollDown();
		}
	}

	function send(event?: SubmitEvent) {
		event?.preventDefault();
		const text = draft.trim();
		if (!text || busy) return;
		step = null;
		draft = '';
		say(text);
		ask({ message: text });
	}

	function sendOnEnter(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			send();
		}
	}

	function helpPaying() {
		say('Help paying my vet bill');
		ask({ message: 'I need help paying my vet bill.' });
	}

	async function petNotWell() {
		say("My pet isn't well");
		answers = {};
		if (!questions.length) {
			busy = true;
			questions = await fetch('/api/chat/questions')
				.then((r) => (r.ok ? r.json() : []))
				.catch(() => []);
			busy = false;
		}
		if (!questions.length) {
			messages.push({
				id: nextId++,
				from: 'bot',
				text: 'Tell me what is happening with your pet, and I will help you decide what to do next.'
			});
			focus();
			return;
		}
		messages.push({
			id: nextId++,
			from: 'bot',
			text: 'I will ask a few quick yes or no questions so I can point you to the right care.'
		});
		step = 0;
		scrollDown();
	}

	function answer(yes: boolean) {
		if (!current) return;
		say(`${current.text} ${yes ? 'Yes' : 'No'}`);
		answers[current.id] = yes;
		// A yes to an emergency question is enough; do not make the owner keep answering.
		const done = (yes && current.urgency === 'EMERGENCY') || step === questions.length - 1;
		if (done) {
			step = null;
			ask({ message: '', answers });
		} else {
			step = step! + 1;
			scrollDown();
		}
	}

	const nice = (s: string) => s.toLowerCase().replace(/_/g, ' ');
</script>

<div class="flex h-full min-h-0 flex-col">
	<p
		class="flex items-start gap-2 border-b bg-secondary px-4 py-2 text-xs text-secondary-foreground"
	>
		<CircleAlert class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
		This is not veterinary advice. In an emergency, call your nearest ER vet.
	</p>

	<div bind:this={scroller} class="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
		{#each messages as m (m.id)}
			{#if m.from === 'owner'}
				<div class="flex justify-end">
					<p
						class="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground"
					>
						{m.text}
					</p>
				</div>
			{:else if m.emergency}
				<div
					class="rounded-xl border-2 border-destructive bg-destructive/10 p-3 text-sm"
					role="alert"
				>
					<p class="mb-1 font-heading font-bold text-destructive">{m.label}</p>
					<p class="whitespace-pre-wrap">{m.text}</p>
				</div>
			{:else}
				<div class="max-w-[90%] space-y-2">
					{#if m.label}
						<p
							class="inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
						>
							{m.label}
						</p>
					{/if}
					<p
						class={[
							'rounded-2xl rounded-bl-sm px-3 py-2 text-sm whitespace-pre-wrap',
							m.error ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'
						]}
					>
						{m.text}
					</p>
					{#if m.sources?.length}
						<ul class="grid gap-2">
							{#each m.sources as s (s.id)}
								<li>
									<a
										href={s.url}
										rel="external noopener"
										target="_blank"
										class="flex items-start gap-2 rounded-lg border bg-card p-2.5 text-card-foreground hover:border-primary"
									>
										<span
											class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[0.65rem] font-bold text-primary-foreground"
										>
											{s.number}
										</span>
										<span class="min-w-0 flex-1">
											<span class="block text-sm font-medium">{s.name}</span>
											<span class="block text-xs text-muted-foreground capitalize">
												{nice(s.category)} · {s.mustRepay
													? 'must be repaid'
													: 'no repayment'}{s.verified ? ' · verified' : ''}
											</span>
										</span>
										<ExternalLink
											class="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
											aria-label="opens in a new tab"
										/>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
					{#if m.aiUsed === false}
						<p class="text-xs text-muted-foreground">
							Our AI helper is busy, so this is a short answer.
						</p>
					{/if}
				</div>
			{/if}
		{/each}

		{#if current}
			<div class="space-y-2 rounded-xl border bg-card p-3">
				<p class="text-xs text-muted-foreground">Question {step! + 1} of {questions.length}</p>
				<p class="text-sm font-medium">{current.text}</p>
				<div class="flex gap-2">
					<Button size="sm" variant="outline" class="flex-1" onclick={() => answer(true)}>
						Yes
					</Button>
					<Button size="sm" variant="outline" class="flex-1" onclick={() => answer(false)}>
						No
					</Button>
				</div>
			</div>
		{/if}

		{#if busy}
			<p class="text-sm text-muted-foreground">Thinking…</p>
		{/if}

		{#if !started}
			<div class="grid gap-2 pt-1">
				<Button variant="outline" class="h-auto justify-start py-2.5" onclick={helpPaying}>
					<HandCoins class="text-primary" aria-hidden="true" />
					Help paying my vet bill
				</Button>
				<Button variant="outline" class="h-auto justify-start py-2.5" onclick={petNotWell}>
					<HeartPulse class="text-primary" aria-hidden="true" />
					My pet isn't well
				</Button>
			</div>
		{/if}
	</div>

	<form onsubmit={send} class="flex items-end gap-2 border-t p-3">
		<label for="chat-message" class="sr-only">Your message</label>
		<Textarea
			id="chat-message"
			bind:ref={input}
			bind:value={draft}
			onkeydown={sendOnEnter}
			rows={1}
			maxlength={1000}
			placeholder="Type your question…"
			class="max-h-32 min-h-10 resize-none"
		/>
		<Button type="submit" size="icon" disabled={busy || !draft.trim()} aria-label="Send">
			<SendHorizontal aria-hidden="true" />
		</Button>
	</form>
</div>
