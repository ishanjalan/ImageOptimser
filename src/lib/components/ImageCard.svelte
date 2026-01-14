<script lang="ts">
	import { images, type ImageItem, type ImageFormat } from '$lib/stores/images.svelte';
	import { downloadImage } from '$lib/utils/download';
	import { reprocessImage } from '$lib/utils/compress';
	import { Download, X, AlertCircle, Check, Loader2, ArrowRight, RefreshCw, ChevronDown } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';

	let { item }: { item: ImageItem } = $props();

	let showFormatMenu = $state(false);

	const savings = $derived(
		item.compressedSize ? Math.round((1 - item.compressedSize / item.originalSize) * 100) : 0
	);

	const isPositiveSavings = $derived(savings > 0);

	// Available output formats based on input format
	const availableFormats: { value: ImageFormat; label: string; color: string }[] = [
		{ value: 'jpeg', label: 'JPEG', color: 'from-orange-500 to-red-500' },
		{ value: 'png', label: 'PNG', color: 'from-blue-500 to-indigo-500' },
		{ value: 'webp', label: 'WebP', color: 'from-green-500 to-emerald-500' },
		{ value: 'avif', label: 'AVIF', color: 'from-purple-500 to-pink-500' }
	];

	// Filter out SVG input - can't convert SVG to raster easily
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
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
		class="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-red-500 group-hover:opacity-100"
		aria-label="Remove image"
	>
		<X class="h-4 w-4" />
	</button>

	<div class="flex gap-4 p-4">
		<!-- Thumbnail -->
		<div class="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-surface-100 dark:bg-surface-800">
			<img
				src={item.compressedUrl || item.originalUrl}
				alt={item.name}
				class="h-full w-full object-cover"
			/>
			{#if item.status === 'processing'}
				<div class="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
					<Loader2 class="h-6 w-6 text-white animate-spin" />
				</div>
			{/if}
		</div>

		<!-- Info -->
		<div class="flex flex-1 flex-col justify-center min-w-0">
			<!-- Filename -->
			<p class="truncate text-sm font-medium text-surface-900 dark:text-surface-100" title={item.name}>
				{item.name}
			</p>

			<!-- Status -->
			{#if item.status === 'pending'}
				<p class="mt-1 text-xs text-surface-500">Waiting...</p>
			{:else if item.status === 'processing'}
				<div class="mt-2">
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
						<div
							class="h-full rounded-full bg-gradient-to-r from-accent-start to-accent-end transition-all duration-300"
							style="width: {item.progress}%"
						></div>
					</div>
					<p class="mt-1 text-xs text-surface-500">Processing... {item.progress}%</p>
				</div>
			{:else if item.status === 'completed'}
				<div class="mt-2 flex items-center gap-3">
					<div class="flex items-center gap-1.5 text-xs">
						<span class="font-mono text-surface-500">{formatBytes(item.originalSize)}</span>
						<ArrowRight class="h-3 w-3 text-surface-400" />
						<span class="font-mono font-semibold text-surface-900 dark:text-surface-100">
							{formatBytes(item.compressedSize || 0)}
						</span>
					</div>
					{#if isPositiveSavings}
						<span
							class="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400"
						>
							<Check class="h-3 w-3" />
							-{savings}%
						</span>
					{:else}
						<span
							class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
						>
							+{Math.abs(savings)}%
						</span>
					{/if}
				</div>
			{:else if item.status === 'error'}
				<div class="mt-1 flex items-center gap-1.5 text-xs text-red-500">
					<AlertCircle class="h-3.5 w-3.5" />
					<span>{item.error || 'Compression failed'}</span>
				</div>
			{/if}

			<!-- Format selector -->
			<div class="mt-2 flex items-center gap-2">
				<span
					class="rounded bg-surface-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-surface-500 dark:bg-surface-800"
				>
					{item.format}
				</span>
				<ArrowRight class="h-3 w-3 text-surface-400" />
				
				<!-- Quick format dropdown -->
				<div class="relative">
					<button
						onclick={() => showFormatMenu = !showFormatMenu}
						disabled={item.status === 'processing'}
						class="flex items-center gap-1 rounded bg-gradient-to-r {getCurrentFormatColor()} px-2 py-0.5 text-[10px] font-semibold uppercase text-white shadow-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{item.outputFormat}
						<ChevronDown class="h-3 w-3" />
					</button>
					
					{#if showFormatMenu}
						<div
							class="absolute left-0 bottom-full z-50 mb-1 min-w-[120px] overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/5 dark:bg-surface-800 dark:ring-white/10"
							in:scale={{ duration: 150, start: 0.95 }}
							out:fade={{ duration: 100 }}
						>
							{#each outputOptions as format}
								<button
									onclick={() => handleFormatChange(format.value)}
									class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-100 dark:hover:bg-surface-700 {item.outputFormat === format.value ? 'bg-surface-50 dark:bg-surface-700/50' : ''}"
								>
									<span class="h-2 w-2 rounded-full bg-gradient-to-r {format.color}"></span>
									<span class="font-medium text-surface-700 dark:text-surface-300">{format.label}</span>
									{#if item.outputFormat === format.value}
										<Check class="ml-auto h-3 w-3 text-accent-start" />
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Re-process hint -->
				{#if item.status === 'completed' && item.format !== item.outputFormat}
					<span class="text-[10px] text-surface-400">Click to convert</span>
				{/if}
			</div>
		</div>

		<!-- Download button -->
		{#if item.status === 'completed'}
			<div class="flex items-center">
				<button
					onclick={handleDownload}
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-white shadow-lg shadow-accent-start/30 transition-all hover:scale-110 hover:shadow-xl"
					aria-label="Download"
				>
					<Download class="h-5 w-5" />
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Click outside to close menu -->
{#if showFormatMenu}
	<button
		class="fixed inset-0 z-10"
		onclick={() => showFormatMenu = false}
		aria-label="Close menu"
	></button>
{/if}
