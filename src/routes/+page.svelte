<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import ImageList from '$lib/components/ImageList.svelte';
	import Settings from '$lib/components/Settings.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { images } from '$lib/stores/images.svelte';
	import { processImages } from '$lib/utils/compress';
	import { Download, Trash2, Sparkles, Zap, Shield, Gauge, ArrowDown } from 'lucide-svelte';
	import { downloadAllAsZip } from '$lib/utils/download';
	import { fade, fly } from 'svelte/transition';

	let showClearConfirm = $state(false);

	const hasImages = $derived(images.items.length > 0);
	const completedCount = $derived(images.items.filter((i) => i.status === 'completed').length);
	const totalSaved = $derived(
		images.items
			.filter((i) => i.status === 'completed' && i.compressedSize)
			.reduce((acc, i) => acc + (i.originalSize - (i.compressedSize || 0)), 0)
	);
	const savingsPercent = $derived(
		images.items.length > 0
			? Math.round(
					(totalSaved /
						images.items
							.filter((i) => i.status === 'completed')
							.reduce((acc, i) => acc + i.originalSize, 0)) *
						100
				) || 0
			: 0
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
		if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd') {
			e.preventDefault();
			handleDownloadAll();
		}
		if (e.key === 'Escape' && hasImages) {
			showClearConfirm = true;
		}
	}

	// Paste from clipboard
	async function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;

		const imageFiles: File[] = [];
		for (const item of items) {
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) {
					// Create a new file with a proper name for pasted images
					const ext = file.type.split('/')[1] || 'png';
					const namedFile = new File([file], `pasted-image-${Date.now()}.${ext}`, { type: file.type });
					imageFiles.push(namedFile);
				}
			}
		}

		if (imageFiles.length > 0) {
			const newItems = images.addFiles(imageFiles);
			if (newItems.length > 0) {
				await processImages(newItems.map((i) => i.id));
			}
		}
	}

	const features = [
		{
			icon: Zap,
			title: 'Lightning Fast',
			description: 'WASM-powered codecs for instant compression'
		},
		{
			icon: Shield,
			title: '100% Private',
			description: 'Files never leave your device'
		},
		{
			icon: Gauge,
			title: 'Pro Codecs',
			description: 'MozJPEG, OxiPNG, WebP, AVIF & SVGO'
		}
	];
</script>

<svelte:window onkeydown={handleKeydown} onpaste={handlePaste} />

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

	<main class="flex-1 px-6 pt-20 pb-6">
		<div class="mx-auto max-w-6xl">
			<!-- Hero Section -->
			{#if !hasImages}
				<div class="mb-4 text-center" in:fade={{ duration: 300 }}>
					<div class="mb-2 inline-flex items-center gap-2 rounded-full bg-accent-start/10 px-3 py-1 text-xs font-medium text-accent-start">
						<Sparkles class="h-3 w-3" />
						Free & Open Source
					</div>
					<h1 class="mb-2 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
						<span class="gradient-text">Optimize</span> your images
						<span class="text-surface-600 dark:text-surface-400">in seconds</span>
					</h1>
					<p class="mx-auto max-w-2xl text-sm text-surface-500 sm:text-base">
						Compress JPEG, PNG, WebP, AVIF, GIF, and SVG with powerful algorithms.
						<span class="font-medium text-surface-700 dark:text-surface-300">100% private</span>
						— everything runs in your browser.
					</p>

					<!-- Feature Cards - Inline -->
					<div class="mt-5 grid gap-3 sm:grid-cols-3">
						{#each features as feature, i}
							<div
								class="glass group flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all hover:scale-[1.02]"
								in:fly={{ y: 20, delay: 100 * i, duration: 300 }}
							>
								<div
									class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-start/20 to-accent-end/20 text-accent-start"
								>
									<feature.icon class="h-4 w-4" />
								</div>
								<div>
									<h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
										{feature.title}
									</h3>
									<p class="text-xs text-surface-500">{feature.description}</p>
								</div>
							</div>
						{/each}
					</div>

					<!-- Scroll hint -->
					<div class="mt-4 flex items-center justify-center gap-2 text-surface-400">
						<span class="text-xs uppercase tracking-wider">Drop images below</span>
						<ArrowDown class="h-3 w-3 animate-bounce" />
					</div>
				</div>
			{/if}

			<!-- Stats bar when there are images -->
			{#if hasImages}
				<div
					class="glass mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
					in:fade={{ duration: 200 }}
				>
					<div class="flex flex-wrap items-center gap-4 sm:gap-6">
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
							<div class="flex items-center gap-3">
								<div class="text-sm text-surface-500">
									Saved:
									<span class="font-mono font-semibold text-accent-start"
										>{formatBytes(totalSaved)}</span
									>
								</div>
								<span
									class="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-bold text-green-500"
								>
									-{savingsPercent}%
								</span>
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						{#if completedCount > 0}
							<button
								onclick={handleDownloadAll}
								class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-start to-accent-end px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent-start/30 transition-all hover:shadow-xl hover:shadow-accent-start/40 hover:scale-105"
							>
								<Download class="h-4 w-4" />
								<span class="hidden sm:inline">Download All</span>
								<span class="sm:hidden">ZIP</span>
							</button>
						{/if}
					<button
						onclick={() => showClearConfirm = true}
						class="flex items-center gap-2 rounded-xl bg-surface-100 px-4 py-2 text-sm font-medium text-surface-600 transition-all hover:bg-red-50 hover:text-red-600 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
						title="Press Escape to clear"
					>
						<Trash2 class="h-4 w-4" />
						<span class="hidden sm:inline">Clear All</span>
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

<!-- Clear All Confirmation Modal -->
<ConfirmModal
	open={showClearConfirm}
	title="Clear all images?"
	message="This will remove all {images.items.length} images from the list. This action cannot be undone."
	confirmText="Clear All"
	onconfirm={() => {
		images.clearAll();
		showClearConfirm = false;
	}}
	oncancel={() => showClearConfirm = false}
/>
