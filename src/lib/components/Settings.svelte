<script lang="ts">
	import { images, type ImageFormat } from '$lib/stores/images.svelte';
	import { Settings2, Sliders } from 'lucide-svelte';

	const formats: { value: 'same' | ImageFormat; label: string }[] = [
		{ value: 'same', label: 'Keep Original' },
		{ value: 'jpeg', label: 'JPEG' },
		{ value: 'png', label: 'PNG' },
		{ value: 'webp', label: 'WebP' },
		{ value: 'avif', label: 'AVIF' }
	];

	function handleQualityChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value);
		images.updateSettings({ quality: value });
	}

	function handleFormatChange(format: 'same' | ImageFormat) {
		images.updateSettings({ outputFormat: format });
	}
</script>

<div class="glass mb-6 rounded-2xl p-5">
	<div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
		<!-- Quality Slider -->
		<div class="flex-1">
			<div class="mb-3 flex items-center gap-2">
				<Sliders class="h-4 w-4 text-surface-500" />
				<label for="quality" class="text-sm font-medium text-surface-700 dark:text-surface-300">
					Quality
				</label>
				<span class="ml-auto font-mono text-sm font-semibold text-accent-start">
					{images.settings.quality}%
				</span>
			</div>
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
					<span>Smaller</span>
					<span>Better</span>
				</div>
			</div>
		</div>

		<!-- Format Selector -->
		<div class="md:w-auto">
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
						class="px-3 py-1.5 text-sm font-medium rounded-lg transition-all {images.settings
							.outputFormat === format.value
							? 'bg-gradient-to-r from-accent-start to-accent-end text-white shadow-lg shadow-accent-start/30'
							: 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'}"
					>
						{format.label}
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>
