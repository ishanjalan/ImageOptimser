<script lang="ts">
	import { images, type ImageItem, type ImageFormat } from '$lib/stores/images.svelte';
	import { downloadImage } from '$lib/utils/download';
	import { reprocessImage } from '$lib/utils/compress';
	import CompareSlider from './CompareSlider.svelte';
	import PreviewModal from './PreviewModal.svelte';
	import { Download, X, AlertCircle, Check, Loader2, ArrowRight, ChevronDown, RotateCcw, SplitSquareHorizontal } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';

	let { item }: { item: ImageItem } = $props();

	let showFormatMenu = $state(false);
	let showCompare = $state(false);
	let showPreview = $state(false);

	const savings = $derived(
		item.compressedSize ? Math.round((1 - item.compressedSize / item.originalSize) * 100) : 0
	);

	const isPositiveSavings = $derived(savings > 0);

	const availableFormats: { value: ImageFormat; label: string; color: string }[] = [
		{ value: 'jpeg', label: 'JPEG', color: 'from-orange-500 to-red-500' },
		{ value: 'png', label: 'PNG', color: 'from-blue-500 to-indigo-500' },
		{ value: 'webp', label: 'WebP', color: 'from-green-500 to-emerald-500' },
		{ value: 'avif', label: 'AVIF', color: 'from-purple-500 to-pink-500' }
	];

	const outputOptions = $derived(
		item.format === 'svg'
			? [{ value: 'svg' as ImageFormat, label: 'SVG', color: 'from-cyan-500 to-blue-500' }]
			: item.format === 'gif'
				? [{ value: 'gif' as ImageFormat, label: 'GIF', color: 'from-yellow-500 to-orange-500' }, ...availableFormats]
				: availableFormats
	);

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function handleRemove() {
		images.removeItem(item.id);
	}

	function handleDownload() {
		downloadImage(item);
	}

	async function handleFormatChange(format: ImageFormat) {
		showFormatMenu = false;
		if (format !== item.outputFormat) {
			await reprocessImage(item.id, format);
		}
	}

	async function handleRetry() {
		await reprocessImage(item.id, item.outputFormat);
	}

	function getCurrentFormatColor() {
		const format = outputOptions.find(f => f.value === item.outputFormat);
		return format?.color || 'from-gray-500 to-gray-600';
	}
</script>

<div
	class="glass group relative rounded-2xl transition-all duration-300 hover:shadow-lg"
	in:scale={{ duration: 200, start: 0.95 }}
	out:fade={{ duration: 150 }}
>
	<!-- Remove button -->
	<button
		onclick={handleRemove}
		class="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-surface-200 text-surface-500 opacity-0 shadow-md transition-all hover:bg-red-500 hover:text-white group-hover:opacity-100 dark:bg-surface-700"
		aria-label="Remove image"
	>
		<X class="h-3.5 w-3.5" />
	</button>

	<!-- Thumbnail - larger, clickable -->
	<button
		onclick={() => showPreview = true}
		class="relative w-full aspect-video overflow-hidden rounded-t-2xl bg-surface-100 dark:bg-surface-800 cursor-pointer focus:outline-none"
		aria-label="Preview image"
	>
		<img
			src={item.compressedUrl || item.originalUrl}
			alt={item.name}
			class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
		/>
		{#if item.status === 'processing'}
			<div class="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
				<Loader2 class="h-8 w-8 text-white animate-spin" />
			</div>
		{/if}
		
		<!-- Savings badge overlay -->
		{#if item.status === 'completed'}
			<div class="absolute top-2 right-2">
				{#if isPositiveSavings}
					<span class="flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
						<Check class="h-3 w-3" />
						-{savings}%
					</span>
				{:else}
					<span class="rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
						+{Math.abs(savings)}%
					</span>
				{/if}
			</div>
		{/if}
	</button>

	<!-- Info section -->
	<div class="p-3">
		<!-- Filename + Size -->
		<div class="flex items-center justify-between gap-2 mb-2">
			<p class="truncate text-sm font-medium text-surface-900 dark:text-surface-100" title={item.name}>
				{item.name}
			</p>
			{#if item.status === 'completed' && item.compressedSize}
				<span class="flex-shrink-0 text-xs font-mono text-accent-start font-semibold">
					{formatBytes(item.compressedSize)}
				</span>
			{/if}
		</div>

		<!-- Status / Progress -->
		{#if item.status === 'pending'}
			<p class="text-xs text-surface-500">Waiting...</p>
		{:else if item.status === 'processing'}
			<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
				<div
					class="h-full rounded-full bg-gradient-to-r from-accent-start to-accent-end transition-all duration-300"
					style="width: {item.progress}%"
				></div>
			</div>
		{:else if item.status === 'error'}
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-1.5 text-xs text-red-500">
					<AlertCircle class="h-3.5 w-3.5" />
					<span>Failed</span>
				</div>
				<button
					onclick={handleRetry}
					class="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
				>
					<RotateCcw class="h-3 w-3" />
					Retry
				</button>
			</div>
		{:else if item.status === 'completed'}
			<!-- Format + Actions row -->
			<div class="flex items-center justify-between">
				<!-- Format selector -->
				<div class="flex items-center gap-1.5">
					<span class="text-[10px] font-medium uppercase text-surface-400">
						{item.format}
					</span>
					<ArrowRight class="h-3 w-3 text-surface-300" />
					<div class="relative">
						<button
							onclick={() => showFormatMenu = !showFormatMenu}
							class="flex items-center gap-1 rounded-md bg-gradient-to-r {getCurrentFormatColor()} px-2 py-0.5 text-[10px] font-bold uppercase text-white transition-all hover:opacity-90"
						>
							{item.outputFormat}
							<ChevronDown class="h-3 w-3" />
						</button>
						
						{#if showFormatMenu}
							<button
								class="fixed inset-0 z-40 cursor-default"
								onclick={() => showFormatMenu = false}
								aria-label="Close menu"
							></button>
							<div
								class="absolute left-0 bottom-full z-50 mb-1 min-w-[100px] overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/10 dark:bg-surface-800 dark:ring-white/10"
								in:scale={{ duration: 150, start: 0.95 }}
								out:fade={{ duration: 100 }}
							>
								{#each outputOptions as format}
									<button
										onclick={() => handleFormatChange(format.value)}
										class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface-100 dark:hover:bg-surface-700 {item.outputFormat === format.value ? 'bg-surface-50 dark:bg-surface-700/50' : ''}"
									>
										<span class="h-2 w-2 rounded-full bg-gradient-to-r {format.color}"></span>
										<span class="font-medium text-surface-700 dark:text-surface-300">{format.label}</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Action buttons -->
				<div class="flex items-center gap-1">
					<button
						onclick={() => showCompare = true}
						class="flex h-7 w-7 items-center justify-center rounded-lg text-surface-500 transition-all hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-300"
						aria-label="Compare"
						title="Compare before/after"
					>
						<SplitSquareHorizontal class="h-4 w-4" />
					</button>
					<button
						onclick={handleDownload}
						class="flex h-7 items-center gap-1 rounded-lg bg-gradient-to-r from-accent-start to-accent-end px-2 text-xs font-medium text-white transition-all hover:opacity-90"
						aria-label="Download"
					>
						<Download class="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Compare Slider Modal -->
{#if showCompare && item.compressedUrl}
	<CompareSlider
		originalUrl={item.originalUrl}
		compressedUrl={item.compressedUrl}
		onclose={() => showCompare = false}
	/>
{/if}

<!-- Preview Modal -->
{#if showPreview}
	<PreviewModal
		{item}
		onclose={() => showPreview = false}
	/>
{/if}
