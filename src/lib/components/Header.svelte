<script lang="ts">
	import { base } from '$app/paths';
	import { Github, Zap, Command, Keyboard, WifiOff, Download, X } from 'lucide-svelte';
	import { scale, fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { images } from '$lib/stores/images.svelte';
	import { toast } from './Toast.svelte';

	const FIRST_VISIT_KEY = 'squish-first-visit-shown';

	function handleLogoClick() {
		const hadImages = images.items.length > 0;
		images.clearAll();
		if (hadImages) {
			toast.info('All images cleared');
		}
	}

	let showShortcuts = $state(false);
	let showFirstRunHint = $state(false);
	let isOffline = $state(false);
	let showInstallPrompt = $state(false);
	let deferredPrompt: any = null;

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
		if (!target.closest('[data-shortcuts-popover]') && !target.closest('[data-first-run-hint]')) {
			showShortcuts = false;
			showFirstRunHint = false;
		}
	}

	function dismissFirstRunHint() {
		showFirstRunHint = false;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(FIRST_VISIT_KEY, 'true');
		}
	}

	// Handle online/offline status
	function updateOnlineStatus() {
		isOffline = !navigator.onLine;
	}

	// Handle PWA install prompt
	function handleBeforeInstallPrompt(e: Event) {
		e.preventDefault();
		deferredPrompt = e;
		showInstallPrompt = true;
	}

	async function handleInstallClick() {
		if (!deferredPrompt) return;

		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		
		if (outcome === 'accepted') {
			showInstallPrompt = false;
		}
		deferredPrompt = null;
	}

	function dismissInstallPrompt() {
		showInstallPrompt = false;
	}

	onMount(() => {
		// Set initial online status
		updateOnlineStatus();

		// Check if first visit
		if (typeof localStorage !== 'undefined') {
			const hasVisited = localStorage.getItem(FIRST_VISIT_KEY);
			if (!hasVisited) {
				// Show first-run hint after a brief delay
				setTimeout(() => {
					showFirstRunHint = true;
				}, 1500);
			}
		}

		// Listen for online/offline events
		window.addEventListener('online', updateOnlineStatus);
		window.addEventListener('offline', updateOnlineStatus);

		// Listen for PWA install prompt
		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		return () => {
			window.removeEventListener('online', updateOnlineStatus);
			window.removeEventListener('offline', updateOnlineStatus);
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		};
	});
</script>

<svelte:window onclick={handleClickOutside} />

<header class="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4">
	<div class="mx-auto max-w-7xl">
		<nav
			class="glass flex items-center justify-between rounded-2xl px-4 sm:px-6 py-3 shadow-lg shadow-black/5"
		>
			<!-- Logo -->
			<a href="{base}/" class="flex items-center gap-3 group" onclick={handleLogoClick}>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-start to-accent-end shadow-lg shadow-accent-start/30 transition-transform group-hover:scale-110"
				>
					<Zap class="h-5 w-5 text-white" strokeWidth={2.5} />
				</div>
				<span class="text-xl font-semibold tracking-tight">
					<span class="gradient-text">Squish</span>
				</span>
			</a>

			<!-- Right side -->
			<div class="flex items-center gap-2">
				<!-- Offline indicator -->
				{#if isOffline}
					<div
						class="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-amber-500"
						transition:fade={{ duration: 150 }}
						title="You're offline. Previously cached files still work."
					>
						<WifiOff class="h-4 w-4" />
						<span class="text-xs font-medium hidden sm:inline">Offline</span>
					</div>
				{/if}

				<!-- Install PWA prompt -->
				{#if showInstallPrompt}
					<button
						onclick={handleInstallClick}
						class="flex items-center gap-2 rounded-xl bg-accent-start/10 px-3 py-2 text-accent-start hover:bg-accent-start/20 transition-colors"
						transition:scale={{ duration: 150, start: 0.95 }}
						title="Install Squish as an app"
					>
						<Download class="h-4 w-4" />
						<span class="text-xs font-medium hidden sm:inline">Install App</span>
					</button>
				{/if}

				<!-- Keyboard shortcuts -->
				<div class="relative" data-shortcuts-popover>
					<button
						onclick={(e) => { e.stopPropagation(); showShortcuts = !showShortcuts; showFirstRunHint = false; }}
						class="flex h-10 w-10 items-center justify-center rounded-xl text-surface-400 transition-all hover:bg-surface-800 hover:text-surface-100 {showFirstRunHint ? 'ring-2 ring-accent-start ring-offset-2 ring-offset-surface-900' : ''}"
						aria-label="Keyboard shortcuts"
						aria-expanded={showShortcuts}
						aria-haspopup="true"
					>
						<Keyboard class="h-5 w-5" />
					</button>

					<!-- First-run hint -->
					{#if showFirstRunHint && !showShortcuts}
						<div
							class="absolute right-0 top-full mt-2 w-72 rounded-xl bg-gradient-to-br from-accent-start to-accent-end p-4 shadow-xl"
							transition:scale={{ duration: 200, start: 0.95 }}
							data-first-run-hint
						>
							<button
								onclick={dismissFirstRunHint}
								class="absolute top-2 right-2 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
								aria-label="Dismiss"
							>
								<X class="h-4 w-4" />
							</button>
							<div class="flex items-start gap-3">
								<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/20">
									<Command class="h-4 w-4 text-white" />
								</div>
								<div>
									<h3 class="text-sm font-semibold text-white">Pro tip: Keyboard shortcuts!</h3>
									<p class="mt-1 text-xs text-white/80">
										Paste images with <kbd class="rounded bg-white/20 px-1.5 py-0.5 font-mono">{modKey}+V</kbd>, 
										download all with <kbd class="rounded bg-white/20 px-1.5 py-0.5 font-mono">{modKey}+Shift+D</kbd>
									</p>
									<button
										onclick={dismissFirstRunHint}
										class="mt-2 text-xs font-medium text-white underline underline-offset-2 hover:no-underline"
									>
										Got it!
									</button>
								</div>
							</div>
						</div>
					{/if}

					{#if showShortcuts}
						<div
							class="absolute right-0 top-full mt-2 w-64 rounded-xl bg-surface-800 p-4 shadow-xl ring-1 ring-white/10"
							transition:scale={{ duration: 150, start: 0.95 }}
							role="tooltip"
						>
							<h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-100">
								<Command class="h-4 w-4 text-accent-start" />
								Keyboard Shortcuts
							</h3>
							<ul class="space-y-2">
								{#each shortcuts as shortcut}
									<li class="flex items-center justify-between text-sm">
										<span class="text-surface-400">{shortcut.action}</span>
										<kbd class="rounded bg-surface-700 px-2 py-0.5 font-mono text-xs text-surface-300">
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
					class="flex h-10 w-10 items-center justify-center rounded-xl text-surface-400 transition-all hover:bg-surface-800 hover:text-surface-100"
					aria-label="View source on GitHub"
				>
					<Github class="h-5 w-5" />
				</a>
			</div>
		</nav>
	</div>
</header>
