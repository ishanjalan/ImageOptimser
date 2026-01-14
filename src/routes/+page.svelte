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
	import { toast } from '$lib/components/Toast.svelte';

	let showClearConfirm = $state(false);
	let previousCompletedCount = $state(0);

	const hasImages = $derived(images.items.length > 0);
	const completedCount = $derived(images.items.filter((i) => i.status === 'completed').length);
	const processingCount = $derived(images.items.filter((i) => i.status === 'processing').length);
	const errorCount = $derived(images.items.filter((i) => i.status === 'error').length);
	const hasUndownloaded = $derived(images.items.some((i) => i.status === 'completed' && i.compressedBlob));
	
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

	// Status text for aria-live region
	const statusText = $derived(
		completedCount > 0
			? `${completedCount} of ${images.items.length} images optimized. ${totalSaved > 0 ? `Saved ${formatBytes(totalSaved)} (${savingsPercent}%)` : ''}`
			: processingCount > 0
				? `Processing ${processingCount} images...`
				: ''
	);

	// Show toast when all images complete
	$effect(() => {
		if (completedCount > previousCompletedCount && processingCount === 0 && completedCount === images.items.length && images.items.length > 0) {
			toast.success(`All ${completedCount} images optimized!`);
		}
		previousCompletedCount = completedCount;
	});

	// Show toast for errors
	$effect(() => {
		if (errorCount > 0) {
			// Only show once per error occurrence
		}
	});

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
			toast.success(`Downloaded ${completedImages.length} images as ZIP`);
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
			const newItems = await images.addFiles(imageFiles);
			if (newItems.length > 0) {
				await processImages(newItems.map((i) => i.id));
			}
		}
	}

	// Unsaved work warning
	function handleBeforeUnload(e: BeforeUnloadEvent) {
		if (hasUndownloaded) {
			e.preventDefault();
			// Modern browsers ignore custom messages but still show a generic one
			return 'You have optimized images that haven\'t been downloaded. Are you sure you want to leave?';
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

<svelte:window 
	onkeydown={handleKeydown} 
	onpaste={handlePaste} 
	onbeforeunload={handleBeforeUnload}
/>

<!-- Screen reader status announcements -->
<div class="sr-only" aria-live="polite" aria-atomic="true">
	{statusText}
</div>

<div class="flex min-h-screen flex-col">
	<Header />

	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
		<div
			class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-accent-start/10 to-accent-end/10 blur-3xl"
		></div>
		<div
			class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-accent-end/10 to-accent-start/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:pb-12">
		<div class="mx-auto max-w-7xl">
			<!-- Hero Section -->
			{#if !hasImages}
				<div class="mb-8 sm:mb-12 text-center" in:fade={{ duration: 300 }}>
					<div class="mb-4 inline-flex items-center gap-2 rounded-full bg-accent-start/10 px-4 py-1.5 text-sm font-medium text-accent-start">
						<Sparkles class="h-4 w-4" />
						Free & Open Source
					</div>
					<h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
						<span class="gradient-text">Optimize</span> your images
						<br class="hidden sm:block" />
						<span class="text-surface-600 dark:text-surface-400">in seconds</span>
					</h1>
					<p class="mx-auto max-w-2xl text-base sm:text-lg text-surface-500 leading-relaxed">
						Compress JPEG, PNG, WebP, AVIF, and SVG with powerful algorithms.
						<span class="font-medium text-surface-700 dark:text-surface-300">100% private</span>
						— everything runs in your browser.
					</p>

					<!-- Feature Cards -->
					<div class="mt-10 sm:mt-12 grid gap-4 sm:gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
						{#each features as feature, i}
							<div
								class="glass group flex items-center gap-4 rounded-2xl p-5 sm:p-6 text-left transition-all hover:scale-[1.02]"
								in:fly={{ y: 20, delay: 100 * i, duration: 300 }}
							>
								<div
									class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-start/20 to-accent-end/20 text-accent-start"
								>
									<feature.icon class="h-6 w-6" />
								</div>
								<div>
									<h3 class="text-base font-semibold text-surface-900 dark:text-surface-100">
										{feature.title}
									</h3>
									<p class="text-sm text-surface-500 mt-0.5">{feature.description}</p>
								</div>
							</div>
						{/each}
					</div>

					<!-- Scroll hint -->
					<div class="mt-10 flex items-center justify-center gap-2 text-surface-400" aria-hidden="true">
						<span class="text-sm uppercase tracking-wider">Drop images below</span>
						<ArrowDown class="h-4 w-4 animate-bounce" />
					</div>
				</div>
			{/if}

			<!-- Stats bar when there are images -->
			{#if hasImages}
				<div
					class="glass mb-6 sm:mb-8 flex flex-wrap items-center justify-between gap-4 sm:gap-6 rounded-2xl p-4 sm:p-6"
					in:fade={{ duration: 200 }}
					role="status"
				>
					<div class="flex flex-wrap items-center gap-4 sm:gap-8">
						<div class="flex items-center gap-3">
							<Sparkles class="h-6 w-6 text-accent-start" aria-hidden="true" />
							<span class="text-base text-surface-500">
								<span class="font-semibold text-surface-900 dark:text-surface-100 text-lg"
									>{completedCount}</span
								>
								of {images.items.length} optimized
							</span>
						</div>
						{#if totalSaved > 0}
							<div class="flex items-center gap-4">
								<div class="text-base text-surface-500">
									Saved:
									<span class="font-mono font-semibold text-accent-start text-lg"
										>{formatBytes(totalSaved)}</span
									>
								</div>
								<span
									class="rounded-full bg-green-500/10 px-3 py-1 text-sm font-bold text-green-500"
								>
									-{savingsPercent}%
								</span>
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						{#if completedCount > 0}
							<button
								onclick={handleDownloadAll}
								class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-start to-accent-end px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent-start/30 transition-all hover:shadow-xl hover:shadow-accent-start/40 hover:scale-105"
							>
								<Download class="h-5 w-5" aria-hidden="true" />
								<span class="hidden sm:inline">Download All</span>
								<span class="sm:hidden">ZIP</span>
							</button>
						{/if}
						<button
							onclick={() => showClearConfirm = true}
							class="flex items-center gap-2 rounded-xl bg-surface-100 px-5 py-2.5 text-sm font-medium text-surface-600 transition-all hover:bg-red-50 hover:text-red-600 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
							aria-label="Clear all images (press Escape)"
						>
							<Trash2 class="h-5 w-5" aria-hidden="true" />
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
