<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		ArrowLeft,
		CircleCheck,
		Eye,
		EyeOff,
		LoaderCircle,
		Lock,
		PawPrint,
		ShieldCheck,
		Target,
		Trophy
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader } from '$lib/components/ui/card';
	import { Field, FieldError, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import type { PageProps } from './$types';

	type Mode = 'signin' | 'signup';
	type Status = 'idle' | 'submitting' | 'success';

	let { form }: PageProps = $props();
	let mode = $state<Mode>('signin');
	let status = $state<Status>('idle');

	// Sign-in fields
	let email = $state('');
	let password = $state('');
	let remember = $state(true);

	// Create-account fields
	let fullName = $state('');
	let signUpEmail = $state('');
	let signUpPassword = $state('');
	let confirmPassword = $state('');
	let acceptTerms = $state(false);

	let showPassword = $state(false);
	let errors = $state<Record<string, string | undefined>>({});

	const isSubmitting = $derived(status === 'submitting');

	const passwordScore = $derived.by(() => {
		let score = 0;
		if (signUpPassword.length >= 8) score++;
		if (/[a-z]/.test(signUpPassword) && /[A-Z]/.test(signUpPassword)) score++;
		if (/\d/.test(signUpPassword)) score++;
		if (/[^A-Za-z0-9]/.test(signUpPassword)) score++;
		return score;
	});

	const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;
	const strengthBars = [
		'bg-destructive',
		'bg-destructive',
		'bg-chart-1',
		'bg-accent',
		'bg-primary'
	] as const;

	function switchMode(next: Mode) {
		if (mode === next) return;
		mode = next;
		status = 'idle';
		errors = {};
	}

	function validEmail(value: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
	}

	function validate() {
		const next: Record<string, string | undefined> = {};
		if (mode === 'signin') {
			if (!validEmail(email)) next.email = 'Please enter a valid email address.';
			if (password.length === 0) next.password = 'Please enter your password.';
		} else {
			if (fullName.trim().length < 2) next.fullName = 'Please tell us your name.';
			if (!validEmail(signUpEmail)) next.signUpEmail = 'Please enter a valid email address.';
			if (signUpPassword.length < 8)
				next.signUpPassword = 'Passwords need to be at least 8 characters.';
			if (confirmPassword !== signUpPassword) next.confirmPassword = 'Passwords don’t match.';
			if (!acceptTerms) next.acceptTerms = 'Please accept the terms to continue.';
		}
		errors = next;
		return Object.keys(next).length === 0;
	}

	function handleSubmit(e: SubmitEvent) {
		if (!validate()) {
			e.preventDefault();
			return;
		}
		status = 'submitting';
	}

	function reset() {
		email = '';
		password = '';
		remember = true;
		fullName = '';
		signUpEmail = '';
		signUpPassword = '';
		confirmPassword = '';
		acceptTerms = false;
		showPassword = false;
		errors = {};
		status = 'idle';
	}
</script>

<svelte:head>
	<title>Sign In | Take the Lead</title>
	<meta
		name="description"
		content="Sign in to your Take the Lead account or create a new one to launch your next fundraiser for the pets you love."
	/>
</svelte:head>

<main class="relative flex min-h-dvh flex-col overflow-hidden lg:flex-row">
	<!-- Brand panel -->
	<aside
		class="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex lg:w-[45%] xl:p-16"
	>
		<PawPrint
			class="pointer-events-none absolute -right-16 -bottom-16 size-96 rotate-12 opacity-[0.06]"
		/>
		<a href={resolve('/campaign')} class="inline-flex items-center gap-3">
			<span class="flex size-11 items-center justify-center rounded-xl bg-background">
				<img src="/ttl-logo.svg" alt="" class="size-7" />
			</span>
			<span class="font-heading text-xl font-bold">Take the Lead</span>
		</a>

		<div class="relative max-w-md space-y-8">
			<h2 class="text-4xl leading-tight">
				Lead the pack.<br />Fund the cause.
			</h2>
			<ul class="space-y-5 text-sm leading-relaxed opacity-90">
				<li class="flex items-start gap-3">
					<Target class="mt-0.5 size-5 shrink-0 text-secondary" />
					<span>Spin up a campaign for your shelter in minutes and start collecting pledges.</span>
				</li>
				<li class="flex items-start gap-3">
					<Trophy class="mt-0.5 size-5 shrink-0 text-secondary" />
					<span>Watch the live leaderboard light up as friends, family, and coworkers step up.</span
					>
				</li>
				<li class="flex items-start gap-3">
					<ShieldCheck class="mt-0.5 size-5 shrink-0 text-secondary" />
					<span>100% of every donation goes straight to the need it was raised for.</span>
				</li>
			</ul>
			<blockquote class="border-l-2 border-secondary/60 pl-4 text-sm italic opacity-80">
				“Rallying my coworkers to walk for the shelter was the easiest good thing our team has ever
				done.”
				<footer class="mt-2 font-medium not-italic opacity-70">— Maya T., team captain</footer>
			</blockquote>
		</div>

		<p class="relative text-xs opacity-60">
			© {new Date().getFullYear()} Take the Lead. Every stride counts for a pet in need.
		</p>
	</aside>

	<!-- Auth panel -->
	<section class="flex flex-1 items-center justify-center bg-background px-4 py-10 sm:px-8">
		<div class="w-full max-w-md">
			<a
				href={resolve('/campaign')}
				class="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
			>
				<img src="/ttl-logo.svg" alt="" class="size-6" />
				Take the Lead
			</a>

			{#if status === 'success'}
				<Card>
					<CardContent class="flex flex-col items-center gap-4 py-8 text-center">
						<span
							class="flex size-14 items-center justify-center rounded-full bg-accent/10 text-accent"
						>
							<CircleCheck class="size-8" aria-hidden="true" />
						</span>
						<h1 class="font-heading text-2xl font-bold">
							{mode === 'signin' ? 'Welcome back!' : 'Your account is ready!'}
						</h1>
						<p class="max-w-xs text-sm text-muted-foreground">
							{mode === 'signin'
								? 'You’re signed in. Your next campaign is waiting.'
								: 'Your account is ready. Start your first campaign from your dashboard.'}
						</p>
						<Button href="/dashboard" class="mt-2 w-full sm:w-auto">
							Go to dashboard
							<ArrowLeft class="size-4 rotate-180" aria-hidden="true" />
						</Button>
						<button
							type="button"
							class="text-sm text-muted-foreground underline-offset-4 hover:underline"
							onclick={reset}>Never mind, take me back</button
						>
					</CardContent>
				</Card>
			{:else}
				<!-- Mode toggle -->
				<div
					class="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
					role="tablist"
					aria-label="Authentication mode"
				>
					<button
						type="button"
						role="tab"
						aria-selected={mode === 'signin'}
						class={cn(
							'rounded-md px-3 py-2 text-sm font-medium transition-all',
							mode === 'signin'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						)}
						onclick={() => switchMode('signin')}>Sign in</button
					>
					<button
						type="button"
						role="tab"
						aria-selected={mode === 'signup'}
						class={cn(
							'rounded-md px-3 py-2 text-sm font-medium transition-all',
							mode === 'signup'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						)}
						onclick={() => switchMode('signup')}>Create account</button
					>
				</div>

				<Card>
					<CardHeader>
						<h1 class="font-heading text-2xl leading-normal font-bold">
							{mode === 'signin' ? 'Sign in' : 'Create your account'}
						</h1>
						<CardDescription>
							{mode === 'signin'
								? 'Welcome back — pick up where you left off.'
								: 'Join the pack and launch your first fundraiser today.'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							method="POST"
							action={mode === 'signin' ? '?/signInEmail' : '?/signUpEmail'}
							novalidate
							onsubmit={handleSubmit}
							use:enhance={() => {
								status = 'submitting';
								return async ({ result, update }) => {
									await update();
									if (result.type === 'success') {
										status = 'success';
									} else {
										status = 'idle';
									}
								};
							}}
						>
							<input type="hidden" name="mode" value={mode} />
							<FieldGroup>
								{#if mode === 'signup'}
									<Field data-invalid={errors.fullName ? 'true' : undefined}>
										<FieldLabel for="signup-name">Full name</FieldLabel>
										<Input
											id="signup-name"
											name="name"
											type="text"
											placeholder="Jamie Rivera"
											autocomplete="name"
											bind:value={fullName}
											aria-invalid={!!errors.fullName}
											oninput={() => (errors.fullName = undefined)}
										/>
										<FieldError errors={errors.fullName ? [{ message: errors.fullName }] : []} />
									</Field>

									<Field data-invalid={errors.signUpEmail ? 'true' : undefined}>
										<FieldLabel for="signup-email">Email</FieldLabel>
										<Input
											id="signup-email"
											name="email"
											type="email"
											placeholder="jamie@example.com"
											autocomplete="email"
											bind:value={signUpEmail}
											aria-invalid={!!errors.signUpEmail}
											oninput={() => (errors.signUpEmail = undefined)}
										/>
										<FieldError
											errors={errors.signUpEmail ? [{ message: errors.signUpEmail }] : []}
										/>
									</Field>

									<Field data-invalid={errors.signUpPassword ? 'true' : undefined}>
										<FieldLabel for="signup-password">Password</FieldLabel>
										<div class="relative">
											<Input
												id="signup-password"
												name="password"
												type={showPassword ? 'text' : 'password'}
												placeholder="At least 8 characters"
												autocomplete="new-password"
												class="pr-10"
												bind:value={signUpPassword}
												aria-invalid={!!errors.signUpPassword}
												oninput={() => (errors.signUpPassword = undefined)}
											/>
											<button
												type="button"
												class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
												aria-label={showPassword ? 'Hide password' : 'Show password'}
												onclick={() => (showPassword = !showPassword)}
											>
												{#if showPassword}
													<EyeOff class="size-4" aria-hidden="true" />
												{:else}
													<Eye class="size-4" aria-hidden="true" />
												{/if}
											</button>
										</div>
										{#if signUpPassword}
											<div class="mt-1 flex items-center gap-2" aria-hidden="true">
												<div class="flex flex-1 gap-1">
													{#each [0, 1, 2, 3] as i (i)}
														<span
															class={cn(
																'h-1 flex-1 rounded-full',
																i < passwordScore ? strengthBars[passwordScore] : 'bg-muted'
															)}
														></span>
													{/each}
												</div>
												<span class="text-xs text-muted-foreground"
													>{strengthLabels[passwordScore]}</span
												>
											</div>
										{/if}
										<FieldError
											errors={errors.signUpPassword ? [{ message: errors.signUpPassword }] : []}
										/>
									</Field>

									<Field data-invalid={errors.confirmPassword ? 'true' : undefined}>
										<FieldLabel for="signup-confirm">Confirm password</FieldLabel>
										<Input
											id="signup-confirm"
											name="confirm-password"
											type={showPassword ? 'text' : 'password'}
											placeholder="Type it again"
											autocomplete="new-password"
											bind:value={confirmPassword}
											aria-invalid={!!errors.confirmPassword}
											oninput={() => (errors.confirmPassword = undefined)}
										/>
										<FieldError
											errors={errors.confirmPassword ? [{ message: errors.confirmPassword }] : []}
										/>
									</Field>

									<Field data-invalid={errors.acceptTerms ? 'true' : undefined}>
										<div class="flex items-start gap-2.5">
											<input
												id="signup-terms"
												name="terms"
												type="checkbox"
												class="mt-0.5 size-4 shrink-0 cursor-pointer rounded accent-primary"
												aria-label="I agree to the Terms of Service and Privacy Policy"
												bind:checked={acceptTerms}
												onchange={() => (errors.acceptTerms = undefined)}
											/>
											<div class="text-sm leading-snug">
												<label for="signup-terms">I agree to the</label>
												<a
													href={resolve('/terms-of-service' as Pathname)}
													class="text-primary underline underline-offset-4">Terms of Service</a
												>
												and
												<a
													href={resolve('/privacy-policy' as Pathname)}
													class="text-primary underline underline-offset-4">Privacy Policy</a
												>.
											</div>
										</div>
										<FieldError
											errors={errors.acceptTerms ? [{ message: errors.acceptTerms }] : []}
										/>
									</Field>
								{:else}
									<Field data-invalid={errors.email ? 'true' : undefined}>
										<FieldLabel for="signin-email">Email</FieldLabel>
										<Input
											id="signin-email"
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

									<Field data-invalid={errors.password ? 'true' : undefined}>
										<div class="flex items-center justify-between">
											<FieldLabel for="signin-password">Password</FieldLabel>
											<button
												type="button"
												class="text-sm text-primary underline-offset-4 hover:underline"
												onclick={() => (errors = {})}>Forgot password?</button
											>
										</div>
										<div class="relative">
											<Input
												id="signin-password"
												name="password"
												type={showPassword ? 'text' : 'password'}
												placeholder="Your password"
												autocomplete="current-password"
												class="pr-10"
												bind:value={password}
												aria-invalid={!!errors.password}
												oninput={() => (errors.password = undefined)}
											/>
											<button
												type="button"
												class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
												aria-label={showPassword ? 'Hide password' : 'Show password'}
												onclick={() => (showPassword = !showPassword)}
											>
												{#if showPassword}
													<EyeOff class="size-4" aria-hidden="true" />
												{:else}
													<Eye class="size-4" aria-hidden="true" />
												{/if}
											</button>
										</div>
										<FieldError errors={errors.password ? [{ message: errors.password }] : []} />
									</Field>

									<div class="flex items-center gap-2.5">
										<input
											id="signin-remember"
											name="remember"
											type="checkbox"
											class="size-4 shrink-0 cursor-pointer rounded accent-primary"
											bind:checked={remember}
										/>
										<label for="signin-remember" class="text-sm">Keep me signed in</label>
									</div>
								{/if}
							</FieldGroup>

							{#if form?.message && form.mode === mode}
								<p class="mt-4 text-sm text-destructive" role="alert">{form.message}</p>
							{/if}

							<Button type="submit" class="mt-6 w-full" disabled={isSubmitting}>
								{#if isSubmitting}
									<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
									{mode === 'signin' ? 'Signing in…' : 'Creating account…'}
								{:else}
									<Lock class="size-4" aria-hidden="true" />
									{mode === 'signin' ? 'Sign in' : 'Create account'}
								{/if}
							</Button>
						</form>
					</CardContent>
				</Card>

				<p class="mt-6 text-center text-sm text-muted-foreground">
					{#if mode === 'signin'}
						New to Take the Lead?
						<button
							type="button"
							class="font-medium text-primary underline-offset-4 hover:underline"
							onclick={() => switchMode('signup')}>Create an account</button
						>
					{:else}
						Already have an account?
						<button
							type="button"
							class="font-medium text-primary underline-offset-4 hover:underline"
							onclick={() => switchMode('signin')}>Sign in</button
						>
					{/if}
				</p>
			{/if}
		</div>
	</section>
</main>
