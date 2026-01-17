<script lang="ts">
	import { X } from 'lucide-svelte';
	import { scale, fade } from 'svelte/transition';
	import { focusTrap } from '$lib/utils/focus-trap';

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
	let dialogRef: HTMLDivElement;

	function getPositionFromEvent(clientX: number): number {
		if (!containerRef) return sliderPosition;
		const rect = containerRef.getBoundingClientRect();
		const x = clientX - rect.left;
		return Math.max(0, Math.min(100, (x / rect.width) * 100));
	}

	function handlePointerDown(e: PointerEvent) {
		e.preventDefault();
		isDragging = true;
		sliderPosition = getPositionFromEvent(e.clientX);
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging) return;
		e.preventDefault();
		sliderPosition = getPositionFromEvent(e.clientX);
	}

	function handlePointerUp(e: PointerEvent) {
		isDragging = false;
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation(); // Prevent global escape handler from firing
			onclose();
		}
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			sliderPosition = Math.max(0, sliderPosition - 2);
		}
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			sliderPosition = Math.min(100, sliderPosition + 2);
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	bind:this={dialogRef}
	use:focusTrap
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
	onclick={handleBackdropClick}
	transition:fade={{ duration: 150 }}
	role="dialog"
	aria-modal="true"
	aria-label="Image comparison"
	tabindex="0"
>
	<!-- Close button -->
	<button
		onclick={onclose}
		class="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
		aria-label="Close comparison"
	>
		<X class="h-6 w-6" />
	</button>

	<!-- Instructions -->
	<div class="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
		Drag slider to compare • Use arrow keys • Press Esc to close
	</div>

	<!-- Comparison container -->
	<div
		bind:this={containerRef}
		class="relative w-[95vw] max-w-5xl aspect-auto select-none overflow-hidden rounded-2xl touch-none shadow-2xl"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		role="slider"
		aria-valuenow={Math.round(sliderPosition)}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label="Comparison slider"
		tabindex="0"
		transition:scale={{ duration: 200, start: 0.95 }}
	>
		<!-- Compressed image (full, bottom layer) -->
		<img
			src={compressedUrl}
			alt="Compressed"
			class="block w-full h-auto max-h-[85vh] object-contain pointer-events-none"
			draggable="false"
		/>

		<!-- Original image (clipped, top layer) -->
		<div
			class="absolute inset-0 overflow-hidden pointer-events-none"
			style="clip-path: polygon(0 0, {sliderPosition}% 0, {sliderPosition}% 100%, 0 100%)"
		>
			<img
				src={originalUrl}
				alt="Original"
				class="block w-full h-auto max-h-[85vh] object-contain"
				draggable="false"
			/>
		</div>

		<!-- Slider line -->
		<div
			class="absolute top-0 bottom-0 w-1 -ml-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
			style="left: {sliderPosition}%"
		>
			<!-- Handle circle -->
			<div
				class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl"
			>
				<svg class="h-6 w-6 text-surface-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 8L22 12L18 16" />
					<path d="M6 8L2 12L6 16" />
				</svg>
			</div>
		</div>

		<!-- Labels -->
		<div class="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm pointer-events-none">
			Original
		</div>
		<div class="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm pointer-events-none">
			Compressed
		</div>
	</div>
</div>
