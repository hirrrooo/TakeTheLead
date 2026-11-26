<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		ArrowLeft,
		Bug,
		HeartHandshake,
		Lightbulb,
		PawPrint,
		Salad,
		ScanLine,
		Sparkles,
		Stethoscope,
		Syringe
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

	const topics = [
		{
			title: 'What is a Routine Wellness Exam?',
			Icon: Stethoscope,
			paragraphs: [
				'This is like a human’s physical checkup — veterinarians inspect eyes, ears, skin, fur, weight and overall health. The more frequent the checkups, the better a pet can be monitored for slow changes.',
				'Pets can’t tell us when they aren’t feeling good, and for most animals, hiding that they don’t feel well is instinctive: they don’t want to be perceived as prey. It’s up to us, their owners and caretakers, to help them stay healthy.',
				'That’s why visits are so important — they provide a document trail where changes in a pet can be both discovered and monitored.'
			],
			highlight:
				'Younger pets should visit a vet annually. Once a pet reaches senior status, they should be seen for a wellness check bi-yearly. High-risk or diagnosed pets may need to be seen more frequently.'
		},
		{
			title: 'Vaccinations',
			Icon: Syringe,
			paragraphs: [
				'Core immunizations include rabies, distemper and parvo and, depending on the pet type, several other shots.',
				'Some vaccines are required by the state — such as rabies — but all vaccines are built with your pet’s wellness in mind and aren’t meant to put your pet at risk.'
			],
			highlight: ''
		},
		{
			title: 'Parasite Prevention',
			Icon: Bug,
			paragraphs: [
				'Parasites are a huge issue for pets for a variety of reasons. Fleas can spread and become zoonotic (meaning people can get them), and there are a variety of other zoonotic parasites, such as worms, to be concerned about.',
				'Preventative medications matter because some infestations can be fatal no matter how quickly they’re caught. If a cat gets heartworm, there is no treatment. If a dog gets heartworm, the treatment is incredibly expensive and extensive, and can be reported as animal abuse if a pet owner declines care.',
				'It is vital that a pet stay up to date on preventative care. Some medications prevent a variety of parasites and the package usually includes treatment per month, so one box can cover a pet for up to six months with monthly administration.'
			],
			highlight:
				'One box around $65 will always win out against a euthanasia bill or extensive, in-hospital treatment.'
		},
		{
			title: 'Diagnostics',
			Icon: ScanLine,
			paragraphs: [
				'Mostly, this is for our older pets or our pets that have existing concerns like hip dysplasia and bone degradation.',
				'Diagnostics may not be necessary in the moment, but bi-yearly or even yearly monitoring of our pet’s internal structure can help us find unintended growths, injuries, and pain that the pet may not be letting show.',
				'We can do our best to listen to our pets, but if they don’t speak or show us what’s wrong, we could still fail them.'
			],
			highlight: ''
		},
		{
			title: 'Dental Care',
			Icon: Sparkles,
			paragraphs: [
				'Pets, especially dogs and cats, need at least yearly teeth cleaning.',
				'There are at-home hygiene steps an owner can take, such as brushing teeth or putting certain types of additives in water, but ultimately a pet’s teeth should be cleaned professionally with x-rays to monitor periodontal disease, tooth damage or loss, gum disease, or infections.'
			],
			highlight:
				'Like we’ve been saying, pets like to keep secrets! Sometimes we don’t know something is wrong until it’s too late!'
		},
		{
			title: 'Nutrition Guidance',
			Icon: Salad,
			paragraphs: [
				'Pet weight is vital to pet care. Most pet diet foods are up to date on the needs of pets, but it is not uncommon for some animals to be lacking in certain nutrients.',
				'Specialized diets requiring veterinarian authorization may be required — and these same diets can help treat things like liver, kidney, pelt and other issues that most commercial-brand food doesn’t target.'
			],
			highlight: ''
		},
		{
			title: 'Spaying and Neutering',
			Icon: HeartHandshake,
			paragraphs: [
				'Everyone loves baby animals — they’re so cute! Unfortunately, it is highly recommended that when a pet is around 6 months old (up to vet discretion!), they be spayed or neutered to prevent future complications that can be biological (like pyometra in female dogs) and behavioral (such as spraying in male cats).',
				'Spaying and neutering also helps with population control and is an appropriate measure in controlling wild colonies of cats and dogs.'
			],
			highlight: ''
		}
	];
</script>

<svelte:head>
	<title>Veterinary Costs and Why | Take the Lead</title>
	<meta
		name="description"
		content="Why routine veterinary care costs what it does: wellness exams, vaccinations, parasite prevention, diagnostics, dental care, nutrition guidance, and spaying and neutering."
	/>
</svelte:head>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 md:py-14">
	<header class="flex flex-col items-center gap-3 text-center">
		<span
			class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
			aria-hidden="true"
		>
			<PawPrint class="size-6" />
		</span>
		<h1>Veterinary Costs and Why</h1>
		<p class="max-w-2xl text-balance text-muted-foreground">
			What you’re actually paying for when you bring a pet to the vet — and why each piece of
			routine care matters.
		</p>
	</header>

	<Card class="border-primary/30 bg-primary/5 text-center" aria-labelledby="pets-keep-secrets">
		<CardHeader>
			<div class="flex flex-wrap items-center justify-center gap-3">
				<span
					class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
					aria-hidden="true"
				>
					<Lightbulb class="size-6" />
				</span>
				<CardTitle id="pets-keep-secrets" class="text-2xl">Pets keep secrets</CardTitle>
			</div>
		</CardHeader>
		<CardContent>
			<p class="mx-auto max-w-3xl leading-relaxed text-balance">
				Remember, if a pet lets you know that something is wrong, the issue has probably been
				bothering them for some time. Pets like to keep secrets not because they’re sneaky, but
				because that’s how they stay alive in the wild!
			</p>
		</CardContent>
	</Card>

	<section class="flex flex-col gap-6" aria-labelledby="cost-breakdown-heading">
		<h2 id="cost-breakdown-heading" class="text-center">Where The Costs Come From</h2>
		<div class="grid gap-6 md:grid-cols-2">
			{#each topics as { title, Icon, paragraphs, highlight } (title)}
				<Card class="h-full">
					<CardHeader>
						<span
							class="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
							aria-hidden="true"
						>
							<Icon class="size-5" />
						</span>
						<CardTitle>{title}</CardTitle>
					</CardHeader>
					<CardContent class="flex flex-col gap-3">
						{#each paragraphs as paragraph, i (i)}
							<CardDescription class="leading-relaxed">{paragraph}</CardDescription>
						{/each}
						{#if highlight}
							<p
								class="rounded-lg border-l-4 border-primary/40 bg-muted/60 px-3 py-2 text-sm leading-relaxed font-medium"
							>
								{highlight}
							</p>
						{/if}
					</CardContent>
				</Card>
			{/each}
		</div>
	</section>

	<div class="flex flex-wrap justify-center gap-3">
		<Button href={resolve('/homepage')} class="gap-2">
			<ArrowLeft class="size-4" aria-hidden="true" />
			Back to home
		</Button>
		<Button variant="outline" href={resolve('/campaign')}>Browse campaigns</Button>
	</div>
</main>
