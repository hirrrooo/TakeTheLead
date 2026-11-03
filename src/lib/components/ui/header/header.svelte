<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { CircleUserRound, LayoutDashboard, LogIn, LogOut, User, UserPlus } from '@lucide/svelte';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';

	let { viewer }: { viewer: { name: string } | null } = $props();

	// Get Help and Profile point at existing pages until chat and profile pages exist.
	const links = [
		{ label: 'Home', href: resolve('/homepage') },
		{ label: 'Dashboard', href: resolve('/dashboard') },
		{ label: 'Get Help', href: resolve('/contact-us') }
	];

	let signOutForm = $state<HTMLFormElement>();
</script>

<header class="border-b bg-background">
	<div class="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
		<div class="flex items-center gap-3 sm:gap-8">
			<a
				href={resolve('/homepage')}
				class="inline-flex items-center gap-2.5"
				aria-label="Take the Lead home"
			>
				<span
					class="flex size-10 items-center justify-center rounded-xl border-2 border-primary bg-white"
				>
					<img src="/ttl-logo.svg" alt="" class="size-7" />
				</span>
				<span class="hidden font-heading text-lg font-bold md:inline">Take the Lead</span>
			</a>
			<nav aria-label="Main">
				<ul class="flex items-center gap-3 sm:gap-6">
					{#each links as link (link.href)}
						<li>
							<a
								href={link.href}
								aria-current={page.url.pathname === link.href ? 'page' : undefined}
								class="text-sm font-medium whitespace-nowrap text-muted-foreground underline-offset-4 hover:text-primary hover:underline aria-[current=page]:text-primary"
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		</div>

		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Account menu"
				class="flex size-10 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10"
			>
				<CircleUserRound class="size-6" aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" class="w-48">
				{#if viewer}
					<DropdownMenuLabel class="truncate">{viewer.name}</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem>
						{#snippet child({ props })}
							<a href={resolve('/dashboard')} {...props}>
								<LayoutDashboard aria-hidden="true" />
								My Dashboard
							</a>
						{/snippet}
					</DropdownMenuItem>
					<DropdownMenuItem>
						{#snippet child({ props })}
							<a href={resolve('/dashboard')} {...props}>
								<User aria-hidden="true" />
								Profile
							</a>
						{/snippet}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={() => signOutForm?.requestSubmit()}>
						<LogOut aria-hidden="true" />
						Sign out
					</DropdownMenuItem>
				{:else}
					<DropdownMenuItem>
						{#snippet child({ props })}
							<a href={resolve('/login')} {...props}>
								<LogIn aria-hidden="true" />
								Sign in
							</a>
						{/snippet}
					</DropdownMenuItem>
					<DropdownMenuItem>
						{#snippet child({ props })}
							<a href={resolve('/login?mode=signup')} {...props}>
								<UserPlus aria-hidden="true" />
								Create account
							</a>
						{/snippet}
					</DropdownMenuItem>
				{/if}
			</DropdownMenuContent>
		</DropdownMenu>
	</div>

	{#if viewer}
		<form
			bind:this={signOutForm}
			method="POST"
			action={`${resolve('/homepage')}?/signOut`}
			hidden
		></form>
	{/if}
</header>
