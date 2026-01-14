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

<header class="fixed top-0 left-0 right-0 z-50 px-6 py-4">
	<div class="mx-auto max-w-6xl">
		<nav
			class="glass flex items-center justify-between rounded-2xl px-6 py-3 shadow-lg shadow-black/5"
		>
			<!-- Logo -->
			<a href="/" class="flex items-center gap-3 group">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-start to-accent-end shadow-lg shadow-accent-start/30 transition-transform group-hover:scale-110"
				>
					<Zap class="h-5 w-5 text-white" strokeWidth={2.5} />
				</div>
				<span class="text-xl font-semibold tracking-tight">
					<span class="gradient-text">Squishan</span>
				</span>
			</a>

			<!-- Right side -->
			<div class="flex items-center gap-2">
				<a
					href="https://github.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex h-10 w-10 items-center justify-center rounded-xl text-surface-500 transition-all hover:bg-surface-100 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-surface-100"
				>
					<Github class="h-5 w-5" />
				</a>
				<button
					onclick={toggleTheme}
					class="flex h-10 w-10 items-center justify-center rounded-xl text-surface-500 transition-all hover:bg-surface-100 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-surface-100"
					aria-label="Toggle theme"
				>
					{#if isDark}
						<Sun class="h-5 w-5" />
					{:else}
						<Moon class="h-5 w-5" />
					{/if}
				</button>
			</div>
		</nav>
	</div>
</header>
