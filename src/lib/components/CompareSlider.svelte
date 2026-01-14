<script lang="ts">
	import { scale } from 'svelte/transition';

	let {
		originalUrl,
		compressedUrl,
		onclose
	}: {
		originalUrl: string;
		compressedUrl: string;
		onclose: () => void;
	} = $props();

	let sliderPosition = $state(50);
	let isDragging = $state(false);
	let containerRef: HTMLDivElement;

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		updatePosition(e);
	}

	function handleMouseMove(e: MouseEvent) {
		if (isDragging) {
			updatePosition(e);
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleTouchStart(e: TouchEvent) {
		isDragging = true;
		updatePositionTouch(e);
	}

	function handleTouchMove(e: TouchEvent) {
		if (isDragging) {
			updatePositionTouch(e);
		}
	}

	function updatePosition(e: MouseEvent) {
		if (!containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		const x = e.clientX - rect.left;
		sliderPosition = Math.max(0, Math.min(100, (x / rect.width) * 100));
	}

	function updatePositionTouch(e: TouchEvent) {
		if (!containerRef || !e.touches[0]) return;
		const rect = containerRef.getBoundingClientRect();
		const x = e.touches[0].clientX - rect.left;
		sliderPosition = Math.max(0, Math.min(100, (x / rect.width) * 100));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
		if (e.key === 'ArrowLeft') {
			sliderPosition = Math.max(0, sliderPosition - 5);
		}
		if (e.key === 'ArrowRight') {
			sliderPosition = Math.min(100, sliderPosition + 5);
		}
	}
</script>

<svelte:window
	onmousemove={handleMouseMove}
	onmouseup={handleMouseUp}
	ontouchmove={handleTouchMove}
	ontouchend={handleMouseUp}
	onkeydown={handleKeydown}
/>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
	transition:scale={{ duration: 200, start: 0.95 }}
>
	<!-- Close button -->
	<button
		onclick={onclose}
		class="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
		aria-label="Close comparison"
	>
		<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
		</svg>
	</button>

	<!-- Instructions -->
	<div class="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
		Drag slider to compare • Press Esc to close
	</div>

	<!-- Comparison container -->
	<div
		bind:this={containerRef}
		class="relative max-h-[80vh] max-w-[90vw] cursor-ew-resize select-none overflow-hidden rounded-xl"
		onmousedown={handleMouseDown}
		ontouchstart={handleTouchStart}
		role="slider"
		aria-valuenow={sliderPosition}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label="Image comparison slider"
		tabindex="0"
	>
		<!-- Compressed (bottom layer) -->
		<img
			src={compressedUrl}
			alt="Compressed"
			class="block max-h-[80vh] max-w-[90vw] object-contain"
			draggable="false"
		/>

		<!-- Original (top layer with clip) -->
		<div
			class="absolute inset-0 overflow-hidden"
			style="clip-path: inset(0 {100 - sliderPosition}% 0 0)"
		>
			<img
				src={originalUrl}
				alt="Original"
				class="block max-h-[80vh] max-w-[90vw] object-contain"
				draggable="false"
			/>
		</div>

		<!-- Slider line -->
		<div
			class="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
			style="left: {sliderPosition}%"
		>
			<!-- Handle -->
			<div
				class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-xl"
			>
				<svg class="h-5 w-5 text-surface-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
				</svg>
			</div>
		</div>

		<!-- Labels -->
		<div class="absolute bottom-4 left-4 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
			Original
		</div>
		<div class="absolute bottom-4 right-4 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
			Compressed
		</div>
	</div>
</div>
