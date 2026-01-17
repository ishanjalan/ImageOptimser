<script lang="ts">
	import { images, formatBytes, type ImageItem, type OutputFormat } from '$lib';
	import { downloadImage } from '$lib/utils/download';
	import { reprocessImage, getOutputFilename } from '$lib/utils/compress';
	import { toast } from './Toast.svelte';
	import CompareSlider from './CompareSlider.svelte';
	import PreviewModal from './PreviewModal.svelte';
	import { Download, X, AlertCircle, Check, Loader2, ArrowRight, ChevronDown, RotateCcw, SplitSquareHorizontal, ImageIcon, Copy, Square, CheckSquare } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';

	let { 
		item, 
		showSelectionMode = false,
		isFocused = false,
		onFocus
	}: { 
		item: ImageItem; 
		showSelectionMode?: boolean;
		isFocused?: boolean;
		onFocus?: () => void;
	} = $props();

	let showFormatMenu = $state(false);
	let showCompare = $state(false);
	let showPreview = $state(false);
	
	const isSelected = $derived(images.isSelected(item.id));
	
	function handleSelectionToggle(e: MouseEvent) {
		e.stopPropagation();
		images.toggleSelection(item.id);
	}
	
	function handleCardClick() {
		onFocus?.();
	}

	// Check if Clipboard API is available
	const canCopyToClipboard = typeof navigator !== 'undefined' && 'clipboard' in navigator && 'write' in navigator.clipboard;

	const savings = $derived(
		item.compressedSize ? Math.round((1 - item.compressedSize / item.originalSize) * 100) : 0
	);

	const isPositiveSavings = $derived(savings > 0);

	// HEIC can't be displayed directly in most browsers
	const canDisplayOriginal = $derived(item.format !== 'heic');

	const availableFormats: { value: OutputFormat; label: string; color: string }[] = [
		{ value: 'jpeg', label: 'JPEG', color: 'from-orange-500 to-red-500' },
		{ value: 'png', label: 'PNG', color: 'from-blue-500 to-indigo-500' },
		{ value: 'webp', label: 'WebP', color: 'from-green-500 to-emerald-500' },
		{ value: 'avif', label: 'AVIF', color: 'from-purple-500 to-pink-500' }
	];

	// SVG can now also convert to raster formats
	const svgFormats: { value: OutputFormat; label: string; color: string }[] = [
		{ value: 'svg', label: 'SVG', color: 'from-cyan-500 to-blue-500' },
		{ value: 'webp', label: 'WebP', color: 'from-green-500 to-emerald-500' },
		{ value: 'png', label: 'PNG', color: 'from-blue-500 to-indigo-500' },
		{ value: 'avif', label: 'AVIF', color: 'from-purple-500 to-pink-500' },
		{ value: 'jpeg', label: 'JPEG', color: 'from-orange-500 to-red-500' }
	];

	const outputOptions = $derived(
		item.format === 'svg' ? svgFormats : availableFormats
	);
	
	// Check if SVG is larger than a 3× retina WebP (indicates complex SVG)
	const showWebpSuggestion = $derived(
		item.format === 'svg' &&
		item.outputFormat === 'svg' &&
		item.status === 'completed' &&
		item.webpAlternativeSize // Set only when SVG > 3× WebP
	);

	function handleRemove() {
		images.removeItem(item.id);
	}

	function handleDownload() {
		downloadImage(item);
	}

	async function handleCopy() {
		if (!item.compressedBlob || !canCopyToClipboard) return;

		try {
			// Create a ClipboardItem with the compressed image
			const clipboardItem = new ClipboardItem({
				[item.compressedBlob.type]: item.compressedBlob
			});
			await navigator.clipboard.write([clipboardItem]);
			toast.success('Copied to clipboard!');
		} catch (error) {
			console.error('Failed to copy:', error);
			toast.error('Failed to copy to clipboard');
		}
	}

	async function handleFormatChange(format: OutputFormat) {
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

	// Handle drag start for drag-out-to-save
	function handleDragStart(e: DragEvent) {
		if (!item.compressedBlob || !item.compressedUrl || item.status !== 'completed') {
			e.preventDefault();
			return;
		}

		const filename = getOutputFilename(item.name, item.outputFormat);
		const mimeType = item.compressedBlob.type;

		// Set the drag image
		if (e.dataTransfer) {
			// Use DownloadURL format for native file drag (Chrome/Edge)
			// Format: mime:filename:url
			e.dataTransfer.setData('DownloadURL', `${mimeType}:${filename}:${item.compressedUrl}`);
			
			// Also set as file for other browsers
			e.dataTransfer.setData('text/plain', filename);
			e.dataTransfer.effectAllowed = 'copy';
		}
	}

	// Computed: is the image ready for drag
	const canDrag = $derived(item.status === 'completed' && item.compressedBlob && item.compressedUrl);
</script>

<div
	class="glass group relative rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-black/10 hover:scale-[1.02] {isFocused ? 'ring-2 ring-accent-start ring-offset-2 ring-offset-surface-900 shadow-xl shadow-accent-start/20' : ''}"
	in:scale={{ duration: 200, start: 0.95 }}
	out:fade={{ duration: 150 }}
	onclick={handleCardClick}
	onkeydown={(e) => e.key === 'Enter' && handleCardClick()}
	role="button"
	tabindex="-1"
>
	<!-- Selection checkbox -->
	<button
		onclick={handleSelectionToggle}
		class="absolute -top-2 -left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-lg transition-all {isSelected ? 'bg-accent-start text-white opacity-100' : 'bg-surface-700 text-surface-500'} {showSelectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}"
		aria-label={isSelected ? 'Deselect image' : 'Select image'}
	>
		{#if isSelected}
			<CheckSquare class="h-4 w-4" />
		{:else}
			<Square class="h-4 w-4" />
		{/if}
	</button>

	<!-- Remove button -->
	<button
		onclick={handleRemove}
		class="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface-700 text-surface-500 opacity-0 shadow-lg transition-all hover:bg-red-500 hover:text-white group-hover:opacity-100"
		aria-label="Remove image"
	>
		<X class="h-4 w-4" />
	</button>

	<!-- Thumbnail - clickable and draggable when completed -->
	<div
		role="button"
		tabindex="0"
		onclick={() => (item.status === 'completed' && item.compressedUrl) ? showCompare = true : (canDisplayOriginal ? showPreview = true : null)}
		onkeydown={(e) => e.key === 'Enter' && ((item.status === 'completed' && item.compressedUrl) ? showCompare = true : (canDisplayOriginal ? showPreview = true : null))}
		draggable={canDrag ? true : false}
		ondragstart={handleDragStart}
		class="relative w-full aspect-[4/3] overflow-hidden rounded-t-2xl bg-surface-800 cursor-pointer focus:outline-none {canDrag ? 'cursor-grab active:cursor-grabbing' : ''}"
		aria-label={canDrag ? 'Drag to save or click to compare' : 'Compare or preview image'}
		title={canDrag ? 'Drag to desktop to save' : undefined}
	>
		{#if item.compressedUrl || canDisplayOriginal}
			<img
				src={item.compressedUrl || item.originalUrl}
				alt={item.name}
				class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
				draggable="false"
			/>
		{:else}
			<!-- HEIC placeholder before processing -->
			<div class="h-full w-full flex flex-col items-center justify-center gap-2 text-surface-400">
				<ImageIcon class="h-12 w-12" />
				<span class="text-xs font-medium uppercase">HEIC</span>
			</div>
		{/if}
		{#if item.status === 'processing'}
			<div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-sm">
				<!-- Circular progress indicator -->
				<div class="relative h-16 w-16">
					<svg class="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
						<!-- Background circle -->
						<circle
							cx="32"
							cy="32"
							r="28"
							fill="none"
							stroke="rgba(255,255,255,0.2)"
							stroke-width="4"
						/>
						<!-- Progress circle -->
						<circle
							cx="32"
							cy="32"
							r="28"
							fill="none"
							stroke="url(#progressGradient)"
							stroke-width="4"
							stroke-linecap="round"
							stroke-dasharray={2 * Math.PI * 28}
							stroke-dashoffset={2 * Math.PI * 28 * (1 - item.progress / 100)}
							class="transition-all duration-300"
						/>
						<defs>
							<linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
								<stop offset="0%" stop-color="#10b981" />
								<stop offset="100%" stop-color="#34d399" />
							</linearGradient>
						</defs>
					</svg>
					<!-- Percentage text -->
					<span class="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
						{Math.round(item.progress)}%
					</span>
				</div>
				<!-- Target size mode: show attempt info -->
				{#if item.targetSizeAttempt && item.targetSizeMaxAttempts}
					<span class="text-xs font-medium text-white/80">
						Finding best quality ({item.targetSizeAttempt}/{item.targetSizeMaxAttempts})
					</span>
				{:else}
					<span class="text-xs font-medium text-white/80">Optimizing...</span>
				{/if}
			</div>
		{/if}
		
		<!-- Savings badge overlay -->
		{#if item.status === 'completed'}
			<div class="absolute top-3 right-3 pointer-events-none">
				{#if isPositiveSavings}
					<span class="flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-sm font-bold text-white shadow-lg">
						<Check class="h-4 w-4" />
						-{savings}%
					</span>
				{:else}
					<span class="rounded-full bg-amber-500 px-3 py-1.5 text-sm font-bold text-white shadow-lg">
						+{Math.abs(savings)}%
					</span>
				{/if}
			</div>
			
			<!-- Enhanced hover overlay -->
			<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
			
			<!-- Hover info at bottom -->
			<div class="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
				<div class="flex items-end justify-between">
					<div class="space-y-1">
						<div class="text-[10px] font-medium text-white/70 uppercase tracking-wide">Original</div>
						<div class="text-xs font-mono text-white">
							{formatBytes(item.originalSize)} · {item.format.toUpperCase()}
						</div>
					</div>
					<span class="rounded-full bg-white/20 backdrop-blur-sm px-2 py-1 text-[10px] font-medium text-white">
						Drag to save
					</span>
				</div>
			</div>
			
			<!-- Quick actions on hover (center) -->
			<div class="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
				<button
					onclick={(e) => { e.stopPropagation(); showCompare = true; }}
					class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition-all hover:bg-white/30 hover:scale-110 pointer-events-auto"
					title="Compare before/after"
				>
					<SplitSquareHorizontal class="h-5 w-5" />
				</button>
				<button
					onclick={(e) => { e.stopPropagation(); handleDownload(); }}
					class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition-all hover:bg-white/30 hover:scale-110 pointer-events-auto"
					title="Download"
				>
					<Download class="h-5 w-5" />
				</button>
				{#if canCopyToClipboard}
					<button
						onclick={(e) => { e.stopPropagation(); handleCopy(); }}
						class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition-all hover:bg-white/30 hover:scale-110 pointer-events-auto"
						title="Copy to clipboard"
					>
						<Copy class="h-5 w-5" />
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Info section -->
	<div class="p-4">
		<!-- Filename + Size -->
		<div class="flex items-center justify-between gap-3 mb-1">
			<p class="truncate text-sm font-medium text-surface-100" title={item.name}>
				{item.name}
			</p>
			{#if item.status === 'completed' && item.compressedSize}
				<span class="flex-shrink-0 text-sm font-mono text-accent-start font-semibold">
					{formatBytes(item.compressedSize)}
				</span>
			{/if}
		</div>
		<!-- Dimensions + Multi-scale badge -->
		<div class="flex items-center gap-2 mb-3">
			{#if item.width && item.height}
				<p class="text-xs text-surface-400">{item.width} × {item.height}</p>
			{/if}
		</div>

		<!-- Status / Progress -->
		{#if item.status === 'pending'}
			<p class="text-sm text-surface-500">Waiting...</p>
		{:else if item.status === 'processing'}
			<div class="flex items-center gap-3">
				<div class="flex-1 h-2 overflow-hidden rounded-full bg-surface-700">
					<div
						class="h-full rounded-full bg-gradient-to-r from-accent-start to-accent-end transition-all duration-300"
						style="width: {item.progress}%"
					></div>
				</div>
				<span class="text-xs font-mono font-medium text-surface-500 tabular-nums w-8">
					{Math.round(item.progress)}%
				</span>
			</div>
		{:else if item.status === 'error'}
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-sm text-red-500">
						<AlertCircle class="h-4 w-4 flex-shrink-0" />
						<span>Failed</span>
					</div>
					<button
						onclick={handleRetry}
						class="flex items-center gap-1.5 rounded-lg bg-red-900/30 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-900/50"
					>
						<RotateCcw class="h-4 w-4" />
						Retry
					</button>
				</div>
				{#if item.error}
					<p class="text-xs text-red-500 leading-relaxed">
						{item.error}
					</p>
				{/if}
			</div>
		{:else if item.status === 'completed'}
			<!-- Format + Actions row -->
			<div class="flex items-center justify-between">
				<!-- Format selector -->
				<div class="flex items-center gap-2">
					<span class="text-xs font-medium uppercase text-surface-400">
						{item.format}
					</span>
					<ArrowRight class="h-3.5 w-3.5 text-surface-400" />
					<!-- Format dropdown for all images (including SVG now) -->
					<div class="relative">
						<button
							onclick={() => showFormatMenu = !showFormatMenu}
							class="flex items-center gap-1.5 rounded-lg bg-gradient-to-r {getCurrentFormatColor()} px-2.5 py-1 text-xs font-bold uppercase text-white transition-all hover:opacity-90"
						>
							{item.outputFormat}
							<ChevronDown class="h-3.5 w-3.5" />
						</button>
						
						{#if showFormatMenu}
							<button
								class="fixed inset-0 z-40 cursor-default"
								onclick={() => showFormatMenu = false}
								aria-label="Close menu"
							></button>
							<div
								class="absolute left-0 bottom-full z-50 mb-2 min-w-[120px] overflow-hidden rounded-xl bg-surface-800 shadow-xl ring-1 ring-white/10"
								in:scale={{ duration: 150, start: 0.95 }}
								out:fade={{ duration: 100 }}
							>
								{#each outputOptions as format}
									<button
										onclick={() => handleFormatChange(format.value)}
										class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-700 {item.outputFormat === format.value ? 'bg-surface-700/50' : ''}"
									>
										<span class="h-2.5 w-2.5 rounded-full bg-gradient-to-r {format.color}"></span>
										<span class="font-medium text-surface-300">{format.label}</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Action buttons -->
				<div class="flex items-center gap-1.5">
					<button
						onclick={() => showCompare = true}
						class="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition-all hover:bg-surface-700 hover:text-surface-300"
						aria-label="Compare"
						title="Compare before/after"
					>
						<SplitSquareHorizontal class="h-4 w-4" />
					</button>
					{#if canCopyToClipboard}
						<button
							onclick={handleCopy}
							class="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition-all hover:bg-surface-700 hover:text-surface-300"
							aria-label="Copy to clipboard"
							title="Copy to clipboard"
						>
							<Copy class="h-4 w-4" />
						</button>
					{/if}
					<button
						onclick={handleDownload}
						class="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-start to-accent-end px-2.5 text-sm font-medium text-white transition-all hover:opacity-90 hover:shadow-md"
						aria-label="Download"
						title="Download"
					>
						<Download class="h-4 w-4" />
					</button>
				</div>
			</div>
			
			<!-- Complex SVG Warning -->
			{#if showWebpSuggestion}
				<button
					onclick={() => handleFormatChange('webp')}
					class="mt-3 flex w-full items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-400 transition-colors hover:bg-amber-500/20"
				>
					<AlertCircle class="h-4 w-4 flex-shrink-0" />
					<span>
						Complex SVG — even a 3× retina WebP is smaller (<strong>{formatBytes(item.webpAlternativeSize!)}</strong>). Click to convert.
					</span>
				</button>
			{/if}
			
			<!-- Resize info -->
			{#if item.resizedWidth && item.resizedHeight && item.width && item.height}
				<div class="mt-2 text-xs text-surface-500">
					Resized: {item.width} × {item.height} → {item.resizedWidth} × {item.resizedHeight}
				</div>
			{/if}
			
			<!-- Target size warning -->
			{#if item.targetSizeWarning}
				<div class="mt-3 flex w-full items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-400">
					<AlertCircle class="h-4 w-4 flex-shrink-0" />
					<span>{item.targetSizeWarning}</span>
				</div>
			{:else if item.achievedQuality}
				<div class="mt-2 text-xs text-surface-500">
					Achieved at quality {item.achievedQuality}%
				</div>
			{/if}
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
