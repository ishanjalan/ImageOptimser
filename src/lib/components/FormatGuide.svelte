<script lang="ts">
	import { X, Image, Layers, Zap, Sparkles, Globe, Star } from 'lucide-svelte';
	import { scale, fade } from 'svelte/transition';
	import { focusTrap } from '$lib/utils/focus-trap';

	let { open = false, onclose }: { open: boolean; onclose: () => void } = $props();

	const formats = [
		{
			name: 'JPEG',
			icon: Image,
			color: 'from-orange-500 to-red-500',
			bestFor: 'Photos, complex images',
			pros: ['Smallest file size for photos', 'Universal support'],
			cons: ['No transparency', 'Quality loss on re-save'],
			support: '100%'
		},
		{
			name: 'PNG',
			icon: Layers,
			color: 'from-blue-500 to-indigo-500',
			bestFor: 'Screenshots, graphics with transparency',
			pros: ['Transparency support', 'Lossless quality'],
			cons: ['Larger files than JPEG', 'Not ideal for photos'],
			support: '100%'
		},
		{
			name: 'WebP',
			icon: Zap,
			color: 'from-green-500 to-emerald-500',
			bestFor: 'Web images (recommended)',
			pros: ['25-35% smaller than JPEG', 'Supports transparency', 'Great quality'],
			cons: ['No support in very old browsers'],
			support: '97%'
		},
		{
			name: 'AVIF',
			icon: Sparkles,
			color: 'from-purple-500 to-pink-500',
			bestFor: 'Maximum compression',
			pros: ['50% smaller than JPEG', 'Excellent quality', 'HDR support'],
			cons: ['Slower encoding', 'Limited browser support'],
			support: '93%'
		},
		{
			name: 'JPEG XL',
			icon: Star,
			color: 'from-amber-500 to-orange-500',
			bestFor: 'Best quality & compression',
			pros: ['Best quality at any size', 'Lossless JPEG recompression', 'Progressive loading'],
			cons: ['Limited browser support (Safari, Chrome flag)'],
			support: '~25%'
		}
	];

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="format-guide-title"
		onkeydown={handleKeydown}
		use:focusTrap
	>
		<!-- Backdrop -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			onclick={handleBackdropClick}
			transition:fade={{ duration: 150 }}
		></div>

		<!-- Modal -->
		<div
			class="relative w-full max-w-2xl rounded-2xl bg-surface-900 p-6 shadow-2xl"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Close button -->
			<button
				onclick={onclose}
				class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-800"
				aria-label="Close"
			>
				<X class="h-5 w-5" />
			</button>

			<!-- Header -->
			<div class="mb-6">
				<h2 id="format-guide-title" class="text-xl font-semibold text-surface-100">
					Format Guide
				</h2>
				<p class="mt-1 text-sm text-surface-500">
					Choose the right format for your use case
				</p>
			</div>

			<!-- Format Grid -->
			<div class="grid gap-4 sm:grid-cols-2">
				{#each formats as format}
					<div class="rounded-xl border border-surface-700 p-4">
						<div class="flex items-center gap-3 mb-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br {format.color}">
								<format.icon class="h-5 w-5 text-white" />
							</div>
							<div>
								<h3 class="font-semibold text-surface-100">{format.name}</h3>
								<div class="flex items-center gap-1 text-xs text-surface-500">
									<Globe class="h-3 w-3" />
									<span>{format.support} browser support</span>
								</div>
							</div>
						</div>
						
						<p class="text-sm font-medium text-accent-start mb-2">{format.bestFor}</p>
						
						<div class="space-y-2 text-xs">
							<div>
								<span class="text-green-500 font-medium">Pros:</span>
								<ul class="mt-0.5 text-surface-400">
									{#each format.pros as pro}
										<li class="flex items-start gap-1">
											<span class="text-green-500">+</span>
											{pro}
										</li>
									{/each}
								</ul>
							</div>
							<div>
								<span class="text-amber-500 font-medium">Cons:</span>
								<ul class="mt-0.5 text-surface-400">
									{#each format.cons as con}
										<li class="flex items-start gap-1">
											<span class="text-amber-500">-</span>
											{con}
										</li>
									{/each}
								</ul>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Recommendation -->
			<div class="mt-6 rounded-lg bg-accent-start/10 p-4">
				<p class="text-sm text-surface-300">
					<strong class="text-accent-start">Recommendation:</strong> Use <strong>WebP</strong> for 
					most web images — it offers the best balance of quality, file size, and compatibility. 
					Use <strong>AVIF</strong> for maximum compression, or <strong>JPEG XL</strong> for best quality 
					when targeting Safari or progressive enhancement.
				</p>
			</div>
		</div>
	</div>
{/if}
