<script lang="ts">
	import { base } from '$app/paths';
	import { Sun, Moon, Github, Zap, HelpCircle, Command, Keyboard } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';

	const THEME_KEY = 'squishan-theme';

	// Initialize from DOM state (set by inline script in app.html)
	let isDark = $state(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
	let showShortcuts = $state(false);

	function toggleTheme() {
		isDark = !isDark;
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', isDark);
			localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
		}
	}

	// Detect if Mac for keyboard shortcut display
	const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	const modKey = isMac ? '⌘' : 'Ctrl';

	const shortcuts = [
		{ keys: `${modKey}+Shift+D`, action: 'Download all as ZIP' },
		{ keys: `${modKey}+V`, action: 'Paste image from clipboard' },
		{ keys: 'Escape', action: 'Clear all images' }
	];

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('[data-shortcuts-popover]')) {
			showShortcuts = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<header class="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4">
	<div class="mx-auto max-w-7xl">
		<nav
			class="glass flex items-center justify-between rounded-2xl px-4 sm:px-6 py-3 shadow-lg shadow-black/5"
		>
			<!-- Logo -->
			<a href="{base}/" class="flex items-center gap-3 group">
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
				<!-- Keyboard shortcuts -->
				<div class="relative" data-shortcuts-popover>
					<button
						onclick={(e) => { e.stopPropagation(); showShortcuts = !showShortcuts; }}
						class="flex h-10 w-10 items-center justify-center rounded-xl text-surface-400 transition-all hover:bg-surface-100 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-surface-100"
						aria-label="Keyboard shortcuts"
						aria-expanded={showShortcuts}
						aria-haspopup="true"
					>
						<Keyboard class="h-5 w-5" />
					</button>

					{#if showShortcuts}
						<div
							class="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/10 dark:bg-surface-800 dark:ring-white/10"
							transition:scale={{ duration: 150, start: 0.95 }}
							role="tooltip"
						>
							<h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-surface-100">
								<Command class="h-4 w-4 text-accent-start" />
								Keyboard Shortcuts
							</h3>
							<ul class="space-y-2">
								{#each shortcuts as shortcut}
									<li class="flex items-center justify-between text-sm">
										<span class="text-surface-500">{shortcut.action}</span>
										<kbd class="rounded bg-surface-100 px-2 py-0.5 font-mono text-xs text-surface-600 dark:bg-surface-700 dark:text-surface-400">
											{shortcut.keys}
										</kbd>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>

				<a
					href="https://github.com/ishanjalan/ImageOptimser"
					target="_blank"
					rel="noopener noreferrer"
					class="flex h-10 w-10 items-center justify-center rounded-xl text-surface-400 transition-all hover:bg-surface-100 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-surface-100"
					aria-label="View source on GitHub"
				>
					<Github class="h-5 w-5" />
				</a>
				<button
					onclick={toggleTheme}
					class="flex h-10 w-10 items-center justify-center rounded-xl text-surface-400 transition-all hover:bg-surface-100 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-surface-100"
					aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
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
