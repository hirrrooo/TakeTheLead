<script lang="ts">
	type BrandColor = { name: string; hex: string };
	type PaletteGroup = { name: string; colors: BrandColor[] };

	const palette: PaletteGroup[] = [
		{
			name: 'Primary browns',
			colors: [
				{ name: 'Dark Walnut', hex: '#582F0E' },
				{ name: 'Saddle Brown', hex: '#7F4F24' },
				{ name: 'Camel', hex: '#A68A64' }
			]
		},
		{
			name: 'Accents / greens',
			colors: [
				{ name: 'Charcoal Brown', hex: '#333D29' },
				{ name: 'Dusty Olive', hex: '#656D4A' },
				{ name: 'Dry Sage', hex: '#A4AC86' }
			]
		},
		{
			name: 'Neutrals / backgrounds',
			colors: [
				{ name: 'Khaki Beige', hex: '#B6AD90' },
				{ name: 'Paper', hex: '#F5F2EB' },
				{ name: 'Parchment', hex: '#FDFBF7' }
			]
		}
	];

	const weights = [
		{ label: 'Light 300', value: 300 },
		{ label: 'Regular 400', value: 400 },
		{ label: 'Semi-Bold 600', value: 600 },
		{ label: 'Bold 700', value: 700 }
	];
</script>

<svelte:head>
	<title>Brand Guidelines | Take the Lead</title>
	<meta
		name="description"
		content="The Take the Lead pet fundraising brand colors and typography."
	/>
</svelte:head>

<header class="hero">
	<div class="brand-card">
		<img src="/ttl-logo.svg" alt="Take the Lead logo" width="118" height="136" />
	</div>
	<h1>Brand Guidelines</h1>
	<p>Take the Lead – Pet Fundraising</p>
</header>

<main class="guide">
	<h2 class="page-section-title">Core Identity</h2>

	<div class="identity-grid">
		<section aria-labelledby="palette-title">
			<h3 id="palette-title" class="column-title">Color Palette</h3>
			{#each palette as group (group.name)}
				<div class="palette-group">
					<h4>{group.name}</h4>
					<ul>
						{#each group.colors as color (color.hex)}
							<li class="color-row">
								<span class="swatch" style:background-color={color.hex} aria-hidden="true"></span>
								<span class="color-info">
									<span class="color-name">{color.name}</span>
									<span class="color-hex">{color.hex}</span>
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</section>

		<section aria-labelledby="typography-title">
			<h3 id="typography-title" class="column-title">Typography</h3>
			<div class="type-specimens">
				<div class="type-specimen">
					<p class="type-sample sample-heading-1">Heading 1</p>
					<p class="type-description">Quicksand Bold, 36px (4xl)</p>
				</div>
				<div class="type-specimen">
					<p class="type-sample sample-heading-2">Heading 2</p>
					<p class="type-description">Quicksand Bold, 30px (3xl)</p>
				</div>
				<div class="type-specimen">
					<p class="type-sample sample-heading-3">Heading 3</p>
					<p class="type-description">Quicksand Bold, 24px (2xl)</p>
				</div>
				<div class="type-specimen">
					<p class="type-sample sample-body">
						Body paragraph text used for descriptions and general content.
					</p>
					<p class="type-description">Roboto Slab Regular, 16px (base)</p>
				</div>
				<div class="type-specimen">
					<p class="type-sample sample-code"><code>const isBrand = true;</code></p>
					<p class="type-description">Roboto Mono, 14px (sm)</p>
				</div>
			</div>

			<div class="font-weights">
				<h4>Font Weights</h4>
				<div class="weight-grid">
					<div class="weight-family quicksand-weights">
						<h5>Quicksand (Headings)</h5>
						<ul>
							{#each weights as weight (weight.value)}
								<li style:font-weight={weight.value}>{weight.label}</li>
							{/each}
						</ul>
					</div>
					<div class="weight-family slab-weights">
						<h5>Roboto Slab (Body)</h5>
						<ul>
							{#each weights as weight (weight.value)}
								<li style:font-weight={weight.value}>{weight.label}</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		</section>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		background: #fff;
		color: #582f0e;
	}

	.hero {
		box-sizing: border-box;
		min-height: 312px;
		padding: 13px 24px 64px;
		border-bottom: 1px solid #e8e3d9;
		background: #fdfbf7;
		text-align: center;
	}

	.brand-card {
		width: 100px;
		height: 115px;
		margin-inline: auto;
		background: #fff;
		box-shadow: 0 3px 8px rgb(51 61 41 / 13%);
	}

	.brand-card img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.hero h1 {
		margin: 28px 0 6px;
		font-family: var(--font-heading);
		font-size: clamp(2rem, 3vw, 2.5rem);
		font-weight: 700;
		line-height: 1.12;
		letter-spacing: 0.13em;
		text-transform: uppercase;
		text-wrap: balance;
	}

	.hero p {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 1rem;
		line-height: 1.5;
		letter-spacing: 0.11em;
		text-transform: uppercase;
	}

	.guide {
		box-sizing: border-box;
		max-width: 1000px;
		margin-inline: auto;
		padding: 73px 0 72px;
	}

	.page-section-title {
		display: table;
		margin: 0 0 55px;
		padding-bottom: 8px;
		border-bottom: 2px solid #a68a64;
		font-family: var(--font-heading);
		font-size: 2.25rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.identity-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 56px;
	}

	.column-title {
		margin: 0 0 27px;
		padding-bottom: 11px;
		border-bottom: 1px solid #e8e3d9;
		font-family: var(--font-heading);
		font-size: 1rem;
		font-weight: 700;
		line-height: 1.2;
		text-transform: uppercase;
	}

	.palette-group + .palette-group {
		margin-top: 27px;
	}

	.palette-group h4,
	.font-weights h4 {
		margin: 0 0 13px;
		font-family: var(--font-heading);
		font-size: 0.875rem;
		font-weight: 700;
		line-height: 1.3;
		text-transform: uppercase;
	}

	.palette-group ul,
	.weight-family ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.color-row {
		display: flex;
		align-items: center;
		gap: 14px;
		min-height: 47px;
	}
	.color-row + .color-row {
		margin-top: 14px;
	}

	.swatch {
		box-sizing: border-box;
		flex: 0 0 47px;
		width: 47px;
		height: 47px;
		border: 1px solid rgb(0 0 0 / 9%);
		border-radius: 7px;
	}

	.color-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.color-name {
		font-family: var(--font-heading);
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.3;
	}
	.color-hex {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		line-height: 1.3;
	}

	.type-specimens {
		padding-top: 3px;
	}
	.type-specimen + .type-specimen {
		margin-top: 31px;
	}
	.type-sample,
	.type-description {
		margin: 0;
	}
	.type-sample {
		color: #582f0e;
	}

	.sample-heading-1,
	.sample-heading-2,
	.sample-heading-3 {
		font-family: var(--font-heading);
		font-weight: 700;
		line-height: 1.2;
	}
	.sample-heading-1 {
		font-size: 2.25rem;
	}
	.sample-heading-2 {
		font-size: 1.875rem;
	}
	.sample-heading-3 {
		font-size: 1.5rem;
	}
	.sample-body {
		max-width: 420px;
		font-family: var(--font-body);
		font-size: 1rem;
		line-height: 1.6;
	}
	.sample-code code {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.type-description {
		margin-top: 2px;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		line-height: 1.5;
	}

	.font-weights {
		margin-top: 35px;
		padding-top: 22px;
		border-top: 1px solid #e8e3d9;
	}
	.font-weights h4 {
		margin-bottom: 29px;
	}
	.weight-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 36px;
	}

	.weight-family h5 {
		margin: 0 0 15px;
		padding-bottom: 9px;
		border-bottom: 1px solid #e8e3d9;
		font-family: var(--font-heading);
		font-size: 0.875rem;
		font-weight: 400;
		line-height: 1.3;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.weight-family li {
		font-size: 1rem;
		line-height: 1.45;
	}
	.weight-family li + li {
		margin-top: 15px;
	}
	.quicksand-weights li {
		font-family: var(--font-heading);
	}
	.slab-weights li {
		font-family: var(--font-body);
	}

	@media (max-width: 1080px) {
		.guide {
			max-width: none;
			margin-inline: 7%;
		}
	}

	@media (max-width: 700px) {
		.hero {
			min-height: 280px;
			padding-bottom: 45px;
		}
		.hero h1 {
			margin-top: 24px;
			font-size: clamp(1.75rem, 6vw, 2.25rem);
			letter-spacing: 0.09em;
		}
		.hero p {
			font-size: 0.75rem;
			letter-spacing: 0.07em;
		}
		.guide {
			margin-inline: 24px;
			padding-block: 52px 64px;
		}
		.page-section-title {
			margin-bottom: 42px;
			font-size: 2rem;
		}
		.identity-grid {
			grid-template-columns: 1fr;
			gap: 62px;
		}
	}

	@media (max-width: 400px) {
		.guide {
			margin-inline: 18px;
		}
		.weight-grid {
			gap: 14px;
		}
		.weight-family h5 {
			font-size: 0.75rem;
			letter-spacing: 0;
		}
	}
</style>
