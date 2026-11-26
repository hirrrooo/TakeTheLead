<script lang="ts">
	import { resolve } from '$app/paths';

	// Resources points at the homepage's resources section until a dedicated page exists.
	const links = [
		{ label: 'Privacy Policy', href: resolve('/privacy-policy') },
		{ label: 'Contact Us', href: resolve('/contact-us') },
		{ label: 'About Us', href: resolve('/about-us') },
		{ label: 'Resources', href: resolve('/homepage') }
	];
</script>

<footer class="border-t bg-card">
	<div class="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-6 py-8 text-center">
		<nav aria-label="Footer">
			<ul class="flex flex-wrap justify-center gap-x-6 gap-y-2">
				{#each links as link (link.label)}
					<li>
						<a
							href={link.href}
							class="text-sm font-medium text-primary underline-offset-4 hover:underline"
						>
							{link.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
		<p class="text-sm text-muted-foreground">
			This is not veterinary advice. In an emergency, call your nearest ER vet.
		</p>
		<p class="text-xs text-muted-foreground">
			© {new Date().getFullYear()} Take the Lead. Every stride counts for a pet in need.
		</p>
	</div>
</footer>
