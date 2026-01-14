<script lang="ts">
	import { Sun, Moon, Github, Zap } from 'lucide-svelte';

	let isDark = $state(true);

	function toggleTheme() {
		isDark = !isDark;
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', isDark);
		}
	}

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', isDark);
		}
	});
</script>

<header class="fixed top-0 left-0 right-0 z-50 px-6 py-3">
	<div class="mx-auto max-w-6xl">
		<nav
			class="glass flex items-center justify-between rounded-xl px-4 py-2 shadow-lg shadow-black/5"
		>
			<!-- Logo -->
			<a href="/" class="flex items-center gap-2 group">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-start to-accent-end shadow-lg shadow-accent-start/30 transition-transform group-hover:scale-110"
				>
					<Zap class="h-4 w-4 text-white" strokeWidth={2.5} />
				</div>
				<span class="text-lg font-semibold tracking-tight">
					<span class="gradient-text">Squishan</span>
				</span>
			</a>

			<!-- Right side -->
			<div class="flex items-center gap-1">
				<a
					href="https://github.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 transition-all hover:bg-surface-100 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-surface-100"
				>
					<Github class="h-4 w-4" />
				</a>
				<button
					onclick={toggleTheme}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 transition-all hover:bg-surface-100 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-surface-100"
					aria-label="Toggle theme"
				>
					{#if isDark}
						<Sun class="h-4 w-4" />
					{:else}
						<Moon class="h-4 w-4" />
					{/if}
				</button>
			</div>
		</nav>
	</div>
</header>
