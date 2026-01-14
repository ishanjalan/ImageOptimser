<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import ImageList from '$lib/components/ImageList.svelte';
	import Settings from '$lib/components/Settings.svelte';
	import { images } from '$lib/stores/images.svelte';
	import { Download, Trash2, Sparkles } from 'lucide-svelte';
	import { downloadAllAsZip } from '$lib/utils/download';
	import { fade } from 'svelte/transition';

	const hasImages = $derived(images.items.length > 0);
	const completedCount = $derived(images.items.filter((i) => i.status === 'completed').length);
	const totalSaved = $derived(
		images.items
			.filter((i) => i.status === 'completed' && i.compressedSize)
			.reduce((acc, i) => acc + (i.originalSize - (i.compressedSize || 0)), 0)
	);

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	async function handleDownloadAll() {
		const completedImages = images.items.filter((i) => i.status === 'completed' && i.compressedBlob);
		if (completedImages.length > 0) {
			await downloadAllAsZip(completedImages);
		}
	}

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		// Cmd/Ctrl + Shift + D - Download all
		if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd') {
			e.preventDefault();
			handleDownloadAll();
		}
		// Escape - Clear all
		if (e.key === 'Escape' && hasImages) {
			images.clearAll();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex min-h-screen flex-col">
	<Header />

	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-accent-start/10 to-accent-end/10 blur-3xl"
		></div>
		<div
			class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-accent-end/10 to-accent-start/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-6 pt-28 pb-8">
		<div class="mx-auto max-w-6xl">
			<!-- Hero Section -->
			{#if !hasImages}
				<div class="mb-12 text-center" in:fade={{ duration: 300 }}>
					<h1
						class="mb-4 text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl"
					>
						<span class="gradient-text">Optimize</span> your images
						<br />
						<span class="text-surface-600 dark:text-surface-400">in seconds</span>
					</h1>
					<p class="mx-auto max-w-2xl text-lg text-surface-500 md:text-xl">
						Compress JPEG, PNG, WebP, AVIF, GIF, and SVG files with powerful algorithms.
						<span class="font-medium text-surface-700 dark:text-surface-300"
							>100% free, 100% private</span
						>
						— everything runs in your browser.
					</p>
				</div>
			{/if}

			<!-- Stats bar when there are images -->
			{#if hasImages}
				<div
					class="glass mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
					in:fade={{ duration: 200 }}
				>
					<div class="flex items-center gap-6">
						<div class="flex items-center gap-2">
							<Sparkles class="h-5 w-5 text-accent-start" />
							<span class="text-sm text-surface-500">
								<span class="font-semibold text-surface-900 dark:text-surface-100"
									>{completedCount}</span
								>
								of {images.items.length} optimized
							</span>
						</div>
						{#if totalSaved > 0}
							<div class="text-sm text-surface-500">
								Total saved:
								<span class="font-mono font-semibold text-accent-start"
									>{formatBytes(totalSaved)}</span
								>
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						{#if completedCount > 0}
							<button
								onclick={handleDownloadAll}
								class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-start to-accent-end px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent-start/30 transition-all hover:shadow-xl hover:shadow-accent-start/40"
							>
								<Download class="h-4 w-4" />
								Download All
							</button>
						{/if}
						<button
							onclick={() => images.clearAll()}
							class="flex items-center gap-2 rounded-xl bg-surface-100 px-4 py-2 text-sm font-medium text-surface-600 transition-all hover:bg-red-50 hover:text-red-600 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
						>
							<Trash2 class="h-4 w-4" />
							Clear All
						</button>
					</div>
				</div>
			{/if}

			<!-- Settings Panel -->
			{#if hasImages}
				<Settings />
			{/if}

			<!-- Drop Zone -->
			<DropZone />

			<!-- Image List -->
			{#if hasImages}
				<ImageList />
			{/if}
		</div>
	</main>

	<Footer />
</div>

<style>
	@keyframes fade {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
