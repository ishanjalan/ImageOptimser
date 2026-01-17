<script lang="ts">
	import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-svelte';
	import { scale } from 'svelte/transition';
	import type { ImageItem } from '$lib/stores/images.svelte';
	import { downloadImage } from '$lib/utils/download';

	let {
		item,
		onclose
	}: {
		item: ImageItem;
		onclose: () => void;
	} = $props();

	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isDragging = $state(false);
	let startX = $state(0);
	let startY = $state(0);
	let containerRef: HTMLDivElement;

	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 5;

	function handleZoomIn() {
		zoom = Math.min(MAX_ZOOM, zoom * 1.25);
	}

	function handleZoomOut() {
		zoom = Math.max(MIN_ZOOM, zoom / 1.25);
	}

	function handleReset() {
		zoom = 1;
		panX = 0;
		panY = 0;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * delta));
	}

	function handleMouseDown(e: MouseEvent) {
		if (zoom > 1) {
			isDragging = true;
			startX = e.clientX - panX;
			startY = e.clientY - panY;
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (isDragging) {
			panX = e.clientX - startX;
			panY = e.clientY - startY;
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation(); // Prevent global escape handler from firing
			onclose();
		}
		if (e.key === '+' || e.key === '=') {
			handleZoomIn();
		}
		if (e.key === '-') {
			handleZoomOut();
		}
		if (e.key === '0') {
			handleReset();
		}
	}

	function handleDownload() {
		downloadImage(item);
	}

	const displayUrl = $derived(item.compressedUrl || item.originalUrl);
</script>

<svelte:window
	onmousemove={handleMouseMove}
	onmouseup={handleMouseUp}
	onkeydown={handleKeydown}
/>

<div
	class="fixed inset-0 z-50 flex flex-col bg-black/95"
	transition:scale={{ duration: 200, start: 0.95 }}
>
	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm">
		<div class="flex items-center gap-3">
			<h3 class="text-sm font-medium text-white truncate max-w-[200px] md:max-w-none">
				{item.name}
			</h3>
			{#if item.status === 'completed' && item.compressedSize}
				<span class="text-xs text-surface-400">
					{(item.compressedSize / 1024).toFixed(1)} KB
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<!-- Zoom controls -->
			<div class="flex items-center gap-1 rounded-lg bg-white/10 p-1">
				<button
					onclick={handleZoomOut}
					class="flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/10 transition-colors"
					aria-label="Zoom out"
					disabled={zoom <= MIN_ZOOM}
				>
					<ZoomOut class="h-4 w-4" />
				</button>
				<span class="min-w-[50px] text-center text-xs font-mono text-white">
					{Math.round(zoom * 100)}%
				</span>
				<button
					onclick={handleZoomIn}
					class="flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/10 transition-colors"
					aria-label="Zoom in"
					disabled={zoom >= MAX_ZOOM}
				>
					<ZoomIn class="h-4 w-4" />
				</button>
				<button
					onclick={handleReset}
					class="flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/10 transition-colors"
					aria-label="Reset zoom"
				>
					<RotateCcw class="h-4 w-4" />
				</button>
			</div>

			<!-- Download -->
			{#if item.status === 'completed'}
				<button
					onclick={handleDownload}
					class="flex h-8 items-center gap-1.5 rounded-lg bg-accent-start px-3 text-sm font-medium text-white hover:bg-accent-start/80 transition-colors"
				>
					<Download class="h-4 w-4" />
					<span class="hidden sm:inline">Download</span>
				</button>
			{/if}

			<!-- Close -->
			<button
				onclick={onclose}
				class="flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors"
				aria-label="Close preview"
			>
				<X class="h-5 w-5" />
			</button>
		</div>
	</div>

	<!-- Image container -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={containerRef}
		class="flex-1 overflow-hidden {zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in'} {isDragging ? 'cursor-grabbing' : ''}"
		onwheel={handleWheel}
		onmousedown={handleMouseDown}
		ondblclick={handleZoomIn}
		role="img"
		aria-label="Image preview"
	>
		<div
			class="flex h-full w-full items-center justify-center p-4"
			style="transform: translate({panX}px, {panY}px)"
		>
			<img
				src={displayUrl}
				alt={item.name}
				class="max-h-full max-w-full object-contain transition-transform duration-100"
				style="transform: scale({zoom})"
				draggable="false"
			/>
		</div>
	</div>

	<!-- Footer hints -->
	<div class="flex justify-center gap-4 px-4 py-2 text-xs text-surface-500 bg-black/50">
		<span>Scroll to zoom</span>
		<span>Double-click to zoom in</span>
		<span>Drag to pan</span>
		<span>Press <kbd class="rounded bg-white/10 px-1">Esc</kbd> to close</span>
	</div>
</div>
