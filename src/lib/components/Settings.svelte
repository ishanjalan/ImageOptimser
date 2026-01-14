<script lang="ts">
	import { images, type ImageFormat } from '$lib/stores/images.svelte';
	import { reprocessAllImages } from '$lib/utils/compress';
	import { Settings2, Shield, RefreshCw } from 'lucide-svelte';

	const formats: { value: 'same' | ImageFormat; label: string }[] = [
		{ value: 'same', label: 'Original' },
		{ value: 'jpeg', label: 'JPEG' },
		{ value: 'png', label: 'PNG' },
		{ value: 'webp', label: 'WebP' },
		{ value: 'avif', label: 'AVIF' }
	];

	const presets = [
		{ label: 'Web', value: 75 },
		{ label: 'Social', value: 85 },
		{ label: 'High', value: 95 }
	];

	let isReprocessing = $state(false);

	// Check if any completed images were processed with different settings
	const hasCompletedImages = $derived(images.items.some(i => i.status === 'completed'));

	function handleQualityChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		images.updateSettings({ quality: value });
	}

	function handlePresetClick(value: number) {
		images.updateSettings({ quality: value });
	}

	function handleFormatChange(format: 'same' | ImageFormat) {
		images.updateSettings({ outputFormat: format });
	}

	function handleMetadataToggle() {
		images.updateSettings({ stripMetadata: !images.settings.stripMetadata });
	}

	async function handleReoptimizeAll() {
		isReprocessing = true;
		await reprocessAllImages();
		isReprocessing = false;
	}

	// Calculate slider position percentage for preset markers
	function getPresetPosition(value: number): number {
		return ((value - 10) / 90) * 100;
	}
</script>

<div class="glass mb-4 rounded-xl px-4 py-3">
	<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
		<!-- Quality with integrated presets -->
		<div class="flex items-center gap-3 flex-1 min-w-[280px]">
			<span class="text-xs font-medium text-surface-500 uppercase tracking-wide">Quality</span>
			<div class="relative flex-1 max-w-[300px] pt-5">
				<!-- Preset labels and tick marks -->
				{#each presets as preset}
					<button
						class="absolute pointer-events-auto flex flex-col items-center gap-1 -translate-x-1/2 transition-colors {images.settings.quality === preset.value ? 'text-accent-start' : 'text-surface-400 hover:text-surface-300'}"
						style="left: {getPresetPosition(preset.value)}%; top: 0;"
						onclick={() => handlePresetClick(preset.value)}
					>
						<span class="text-[10px] font-medium">{preset.label}</span>
					</button>
					<div
						class="absolute w-1 h-3 rounded-full pointer-events-none -translate-x-1/2 {images.settings.quality === preset.value ? 'bg-accent-start' : 'bg-surface-600'}"
						style="left: {getPresetPosition(preset.value)}%; top: 18px;"
					></div>
				{/each}
				<!-- Slider -->
				<input
					type="range"
					min="10"
					max="100"
					step="5"
					value={images.settings.quality}
					oninput={handleQualityChange}
					class="w-full h-1.5 bg-surface-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-start [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
				/>
			</div>
			<span class="text-sm font-mono font-semibold text-accent-start w-10 text-right">
				{images.settings.quality}%
			</span>
		</div>

		<!-- Divider -->
		<div class="hidden md:block w-px h-6 bg-surface-700"></div>

		<!-- Output Format -->
		<div class="flex items-center gap-2">
			<Settings2 class="h-3.5 w-3.5 text-surface-500" />
			<div class="flex gap-1">
				{#each formats as format}
					<button
						onclick={() => handleFormatChange(format.value)}
						class="px-2 py-1 text-xs font-medium rounded-md transition-all {images.settings.outputFormat === format.value
							? 'bg-accent-start text-white'
							: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
					>
						{format.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Divider -->
		<div class="hidden md:block w-px h-6 bg-surface-700"></div>

		<!-- Strip Metadata Toggle -->
		<button
			onclick={handleMetadataToggle}
			class="flex items-center gap-2 text-xs {images.settings.stripMetadata ? 'text-accent-start' : 'text-surface-400'}"
			title={images.settings.stripMetadata ? 'EXIF data will be removed' : 'EXIF data will be preserved'}
		>
			<Shield class="h-3.5 w-3.5" />
			<span class="font-medium hidden sm:inline">Strip EXIF</span>
			<div
				class="relative h-4 w-7 rounded-full transition-colors {images.settings.stripMetadata ? 'bg-accent-start' : 'bg-surface-600'}"
			>
				<span
					class="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform {images.settings.stripMetadata ? 'translate-x-3' : 'translate-x-0'}"
				></span>
			</div>
		</button>

		<!-- Divider -->
		{#if hasCompletedImages}
			<div class="hidden md:block w-px h-6 bg-surface-700"></div>

			<!-- Re-optimize All Button -->
			<button
				onclick={handleReoptimizeAll}
				disabled={isReprocessing}
				class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent-start/10 text-accent-start hover:bg-accent-start/20 transition-all disabled:opacity-50"
				title="Re-optimize all images with current settings"
			>
				<RefreshCw class="h-3.5 w-3.5 {isReprocessing ? 'animate-spin' : ''}" />
				<span>{isReprocessing ? 'Optimizing...' : 'Re-optimize All'}</span>
			</button>
		{/if}
	</div>
</div>
