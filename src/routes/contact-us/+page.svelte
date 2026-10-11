<script lang="ts">
	import { CircleCheck, Clock, LoaderCircle, Mail, MapPin, PawPrint, Send } from '@lucide/svelte';
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$lib/components/ui/accordion';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
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
	import { Separator } from '$lib/components/ui/separator';
	import { Textarea } from '$lib/components/ui/textarea';

	type Topic = 'general' | 'fundraising' | 'partnership' | 'other';

	const topicItems: Record<Topic, string> = {
		general: 'General question',
		fundraising: 'Fundraising support',
		partnership: 'Partnership or sponsorship',
		other: 'Something else'
	};

	const faqs = [
		{
			value: 'how-it-works',
			question: 'How does a Take the Lead fundraiser work?',
			answer:
				'You pick a cause, set a goal, and rally friends, family, or coworkers to sponsor your team as it completes challenges. Every donation goes straight to the shelter or rescue you chose.'
		},
		{
			value: 'where-money-goes',
			question: 'Where does the money go?',
			answer:
				'100% of donations reach the registered animal welfare charity you select when you create your campaign. Take the Lead covers its own platform costs through optional supporter tips and sponsors.'
		},
		{
			value: 'team-progress',
			question: 'Can I track my team’s progress?',
			answer:
				'Yes. Every campaign gets a live leaderboard and progress bar you can share, so supporters can see exactly how close your team is to the goal.'
		},
		{
			value: 'groups',
			question: 'Can my company or school run a campaign?',
			answer:
				'Absolutely — groups are our favorite. Reach out with the “Partnership or sponsorship” option below and we’ll help you set up a team hub for your organization.'
		}
	];

	let name = $state('');
	let email = $state('');
	let topic = $state('');
	let message = $state('');

	let errors = $state<{ name?: string; email?: string; topic?: string; message?: string }>({});
	let status = $state<'idle' | 'submitting' | 'success'>('idle');

	const isSubmitting = $derived(status === 'submitting');

	function validate() {
		const next: typeof errors = {};
		if (name.trim().length < 2) next.name = 'Please tell us your name.';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
			next.email = 'Please enter a valid email address.';
		if (!topic) next.topic = 'Please choose what your message is about.';
		if (message.trim().length < 10)
			next.message = 'Please write at least a sentence or two (10+ characters).';
		errors = next;
		return Object.keys(next).length === 0;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!validate()) return;
		status = 'submitting';
		await new Promise((resolve) => setTimeout(resolve, 900));
		status = 'success';
	}

	function reset() {
		name = '';
		email = '';
		topic = '';
		message = '';
		errors = {};
		status = 'idle';
	}
</script>

<svelte:head>
	<title>Contact Us | Take the Lead</title>
	<meta
		name="description"
		content="Questions about your campaign, partnerships, or Take the Lead? Send us a message and our team will get back to you within two business days."
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
		<h1>Contact Us</h1>
		<p class="max-w-xl text-balance text-muted-foreground">
			Whether you’re launching your first campaign or leading a five-alarm fundraiser for the pets
			you love, we’re here to help. Drop us a line below.
		</p>
	</header>

	<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-8">
		<Card>
			{#if status === 'success'}
				<CardContent class="flex flex-col items-center gap-4 py-10 text-center">
					<span
						class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
						aria-hidden="true"
					>
						<CircleCheck class="size-6" />
					</span>
					<div class="space-y-1">
						<CardTitle>Message sent — thank you!</CardTitle>
						<CardDescription>
							We’ve received your note and will reply to <span class="font-medium">{email}</span>
							within two business days.
						</CardDescription>
					</div>
					<Button variant="outline" onclick={reset}>Send another message</Button>
				</CardContent>
			{:else}
				<CardHeader>
					<CardTitle>Send us a message</CardTitle>
					<CardDescription>
						Fill in the form and the right member of our pack will get back to you.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form novalidate onsubmit={handleSubmit}>
						<FieldGroup>
							<div class="grid gap-5 sm:grid-cols-2">
								<Field data-invalid={errors.name ? 'true' : undefined}>
									<FieldLabel for="contact-name">Your name</FieldLabel>
									<Input
										id="contact-name"
										name="name"
										type="text"
										placeholder="Jamie Rivera"
										autocomplete="name"
										bind:value={name}
										aria-invalid={!!errors.name}
										oninput={() => (errors.name = undefined)}
									/>
									<FieldError errors={errors.name ? [{ message: errors.name }] : []} />
								</Field>

								<Field data-invalid={errors.email ? 'true' : undefined}>
									<FieldLabel for="contact-email">Email</FieldLabel>
									<Input
										id="contact-email"
										name="email"
										type="email"
										placeholder="jamie@example.com"
										autocomplete="email"
										bind:value={email}
										aria-invalid={!!errors.email}
										oninput={() => (errors.email = undefined)}
									/>
									<FieldError errors={errors.email ? [{ message: errors.email }] : []} />
								</Field>
							</div>

							<Field data-invalid={errors.topic ? 'true' : undefined}>
								<FieldLabel for="contact-topic">What’s it about?</FieldLabel>
								<Select type="single" bind:value={topic}>
									<SelectTrigger id="contact-topic" name="topic">
										<SelectValue placeholder="Choose a topic" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{#each Object.entries(topicItems) as [value, label] (value)}
												<SelectItem {value} {label}>{label}</SelectItem>
											{/each}
										</SelectGroup>
									</SelectContent>
								</Select>
								<FieldError errors={errors.topic ? [{ message: errors.topic }] : []} />
							</Field>

							<Field data-invalid={errors.message ? 'true' : undefined}>
								<FieldLabel for="contact-message">Message</FieldLabel>
								<Textarea
									id="contact-message"
									name="message"
									placeholder="Tell us how we can help…"
									rows={5}
									bind:value={message}
									aria-invalid={!!errors.message}
									oninput={() => (errors.message = undefined)}
								/>
								<FieldDescription>
									Include your campaign name if you already have one running.
								</FieldDescription>
								<FieldError errors={errors.message ? [{ message: errors.message }] : []} />
							</Field>
						</FieldGroup>

						<Button type="submit" class="mt-6 w-full sm:w-auto" disabled={isSubmitting}>
							{#if isSubmitting}
								<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
								Sending…
							{:else}
								<Send class="size-4" aria-hidden="true" />
								Send message
							{/if}
						</Button>
					</form>
				</CardContent>
			{/if}
		</Card>

		<aside class="flex flex-col gap-6" aria-label="Other ways to reach us">
			<Card>
				<CardHeader>
					<CardTitle>Get in touch</CardTitle>
					<CardDescription>Prefer another channel? Here’s where to find us.</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-col gap-4">
					<a
						href="mailto:hello@takethelead.org"
						class="flex items-start gap-3 text-sm underline-offset-4 hover:text-primary hover:underline"
					>
						<Mail class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
						<span>
							<span class="block font-medium">Email</span>
							<span class="text-muted-foreground">hello@takethelead.org</span>
						</span>
					</a>
					<div class="flex items-start gap-3 text-sm">
						<MapPin class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
						<span>
							<span class="block font-medium">Headquarters</span>
							<span class="text-muted-foreground">
								412 Meadow Lane, Suite 3<br />Portland, OR 97204
							</span>
						</span>
					</div>
					<div class="flex items-start gap-3 text-sm">
						<Clock class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
						<span>
							<span class="block font-medium">Response time</span>
							<span class="text-muted-foreground">Within 2 business days</span>
						</span>
					</div>
					<Separator />
					<p class="flex items-center gap-2 text-sm text-muted-foreground">
						Follow the pack
						<a
							href="https://instagram.com"
							class="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
							target="_blank"
							rel="noopener noreferrer">Instagram</a
						>
						·
						<a
							href="https://facebook.com"
							class="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
							target="_blank"
							rel="noopener noreferrer">Facebook</a
						>
					</p>
				</CardContent>
			</Card>
		</aside>
	</div>

	<section class="mt-14 md:mt-20" aria-labelledby="faq-title">
		<h2 id="faq-title" class="mb-6 text-center">Frequently asked questions</h2>
		<Accordion type="single" class="mx-auto w-full max-w-3xl">
			{#each faqs as faq (faq.value)}
				<AccordionItem value={faq.value}>
					<AccordionTrigger>{faq.question}</AccordionTrigger>
					<AccordionContent>{faq.answer}</AccordionContent>
				</AccordionItem>
			{/each}
		</Accordion>
	</section>
</main>
