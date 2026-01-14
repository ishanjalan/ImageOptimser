<script lang="ts">
	import { images, type ImageFormat } from '$lib/stores/images.svelte';
	import { Settings2, Sliders, Shield, Zap } from 'lucide-svelte';

	const formats: { value: 'same' | ImageFormat; label: string }[] = [
		{ value: 'same', label: 'Keep Original' },
		{ value: 'jpeg', label: 'JPEG' },
		{ value: 'png', label: 'PNG' },
		{ value: 'webp', label: 'WebP' },
		{ value: 'avif', label: 'AVIF' }
	];

	const qualityPresets = [
		{ label: 'Web', value: 75, description: 'Best for websites' },
		{ label: 'Social', value: 85, description: 'Social media' },
		{ label: 'High', value: 95, description: 'Maximum quality' }
	];

	function handleQualityChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		images.updateSettings({ quality: value });
	}

	function handleFormatChange(format: 'same' | ImageFormat) {
		images.updateSettings({ outputFormat: format });
	}

	function handlePresetClick(value: number) {
		images.updateSettings({ quality: value });
	}

	function handleMetadataToggle() {
		images.updateSettings({ stripMetadata: !images.settings.stripMetadata });
	}

	const currentPreset = $derived(
		qualityPresets.find(p => p.value === images.settings.quality)?.label || 'Custom'
	);
</script>

<div class="glass mb-6 rounded-2xl p-5">
	<!-- Quality Section -->
	<div class="mb-6">
		<div class="mb-3 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Sliders class="h-4 w-4 text-surface-500" />
				<label for="quality" class="text-sm font-medium text-surface-700 dark:text-surface-300">
					Quality
				</label>
				<span class="rounded-full bg-accent-start/10 px-2 py-0.5 text-xs font-medium text-accent-start">
					{currentPreset}
				</span>
			</div>
			<span class="font-mono text-sm font-semibold text-accent-start">
				{images.settings.quality}%
			</span>
		</div>

		<!-- Quality Presets -->
		<div class="mb-3 flex gap-2">
			{#each qualityPresets as preset}
				<button
					onclick={() => handlePresetClick(preset.value)}
					class="group flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all {images.settings.quality === preset.value
						? 'bg-gradient-to-r from-accent-start to-accent-end text-white shadow-lg shadow-accent-start/30'
						: 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'}"
					title={preset.description}
				>
					<Zap class="h-4 w-4" />
					<span class="text-xs font-semibold">{preset.label}</span>
					<span class="text-[10px] opacity-70">{preset.value}%</span>
				</button>
			{/each}
		</div>

		<!-- Quality Slider -->
		<div class="relative">
			<input
				type="range"
				id="quality"
				min="10"
				max="100"
				step="5"
				value={images.settings.quality}
				oninput={handleQualityChange}
				class="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-full appearance-none cursor-pointer accent-accent-start [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-accent-start [&::-webkit-slider-thumb]:to-accent-end [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-accent-start/30 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
			/>
			<div class="flex justify-between mt-1 text-xs text-surface-400">
				<span>Smaller file</span>
				<span>Better quality</span>
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
		<!-- Format Selector -->
		<div class="md:flex-1">
			<div class="mb-3 flex items-center gap-2">
				<Settings2 class="h-4 w-4 text-surface-500" />
				<span class="text-sm font-medium text-surface-700 dark:text-surface-300">
					Output Format
				</span>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each formats as format}
					<button
						onclick={() => handleFormatChange(format.value)}
						class="px-3 py-1.5 text-sm font-medium rounded-lg transition-all {images.settings.outputFormat === format.value
							? 'bg-gradient-to-r from-accent-start to-accent-end text-white shadow-lg shadow-accent-start/30'
							: 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'}"
					>
						{format.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Metadata Toggle -->
		<div class="md:w-auto">
			<div class="mb-3 flex items-center gap-2">
				<Shield class="h-4 w-4 text-surface-500" />
				<span class="text-sm font-medium text-surface-700 dark:text-surface-300">
					Strip Metadata
				</span>
				<button
					onclick={handleMetadataToggle}
					class="ml-auto relative h-6 w-11 rounded-full transition-colors {images.settings.stripMetadata
						? 'bg-accent-start'
						: 'bg-surface-300 dark:bg-surface-600'}"
					role="switch"
					aria-checked={images.settings.stripMetadata}
				>
					<span
						class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform {images.settings.stripMetadata
							? 'translate-x-5'
							: 'translate-x-0'}"
					></span>
				</button>
			</div>
			<p class="text-xs text-surface-400">
				{images.settings.stripMetadata ? 'EXIF data will be removed' : 'EXIF data will be preserved'}
			</p>
		</div>
	</div>
</div>
