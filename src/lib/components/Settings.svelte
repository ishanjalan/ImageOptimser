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

	// Quality presets based on common use cases
	const presets = [
		{ label: 'Tiny', value: 50, desc: 'Max compression' },
		{ label: 'Web', value: 75, desc: 'Balanced' },
		{ label: 'Social', value: 85, desc: 'Social media' },
		{ label: 'High', value: 92, desc: 'High quality' },
		{ label: 'Max', value: 98, desc: 'Near-lossless' }
	];

	let isReprocessing = $state(false);
	const hasCompletedImages = $derived(images.items.some(i => i.status === 'completed'));

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

	const currentPreset = $derived(presets.find(p => p.value === images.settings.quality));
</script>

<div class="glass mb-4 rounded-xl px-4 py-3">
	<div class="flex flex-wrap items-center gap-x-4 gap-y-3">
		<!-- Quality Presets -->
		<div class="flex items-center gap-2">
			<span class="text-xs font-medium text-surface-500 uppercase tracking-wide">Quality</span>
			<div class="flex gap-1">
				{#each presets as preset}
					<button
						onclick={() => handlePresetClick(preset.value)}
						class="px-2 py-1 text-xs font-medium rounded-md transition-all {images.settings.quality === preset.value
							? 'bg-accent-start text-white'
							: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
						title="{preset.desc} ({preset.value}%)"
					>
						{preset.label}
					</button>
				{/each}
			</div>
			{#if currentPreset}
				<span class="text-[10px] text-surface-500">{currentPreset.value}%</span>
			{/if}
		</div>

		<!-- Divider -->
		<div class="hidden sm:block w-px h-5 bg-surface-700"></div>

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
		<div class="hidden sm:block w-px h-5 bg-surface-700"></div>

		<!-- Strip Metadata Toggle -->
		<button
			onclick={handleMetadataToggle}
			class="flex items-center gap-1.5 text-xs {images.settings.stripMetadata ? 'text-accent-start' : 'text-surface-400'}"
			title={images.settings.stripMetadata ? 'EXIF data will be removed' : 'EXIF data will be preserved'}
		>
			<Shield class="h-3.5 w-3.5" />
			<div
				class="relative h-4 w-7 rounded-full transition-colors {images.settings.stripMetadata ? 'bg-accent-start' : 'bg-surface-600'}"
			>
				<span
					class="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform {images.settings.stripMetadata ? 'translate-x-3' : 'translate-x-0'}"
				></span>
			</div>
		</button>

		<!-- Re-optimize Button -->
		{#if hasCompletedImages}
			<div class="hidden sm:block w-px h-5 bg-surface-700"></div>
			<button
				onclick={handleReoptimizeAll}
				disabled={isReprocessing}
				class="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-accent-start/10 text-accent-start hover:bg-accent-start/20 transition-all disabled:opacity-50"
			>
				<RefreshCw class="h-3 w-3 {isReprocessing ? 'animate-spin' : ''}" />
				{isReprocessing ? 'Working...' : 'Re-optimize'}
			</button>
		{/if}
	</div>
</div>
