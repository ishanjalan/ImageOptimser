<script lang="ts">
	import { images, type OutputFormat } from '$lib/stores/images.svelte';
	import { reprocessAllImages } from '$lib/utils/compress';
	import { Settings2, Shield, RefreshCw, Sparkles, Layers } from 'lucide-svelte';

	const formats: { value: 'same' | OutputFormat; label: string }[] = [
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
	const isLossless = $derived(images.settings.lossless);
	const export2x = $derived(images.settings.export2x);
	const export3x = $derived(images.settings.export3x);
	const hasScaleExport = $derived(export2x || export3x);

	function handlePresetClick(value: number) {
		images.updateSettings({ quality: value });
	}

	function handleFormatChange(format: 'same' | OutputFormat) {
		images.updateSettings({ outputFormat: format });
	}

	function handleMetadataToggle() {
		images.updateSettings({ stripMetadata: !images.settings.stripMetadata });
	}

	function handleLosslessToggle() {
		images.updateSettings({ lossless: !images.settings.lossless });
	}

	function handleExport2xToggle() {
		images.updateSettings({ export2x: !images.settings.export2x });
	}

	function handleExport3xToggle() {
		images.updateSettings({ export3x: !images.settings.export3x });
	}

	async function handleReoptimizeAll() {
		isReprocessing = true;
		await reprocessAllImages();
		isReprocessing = false;
	}

	const currentPreset = $derived(presets.find(p => p.value === images.settings.quality));
</script>

<div class="glass mb-6 sm:mb-8 rounded-2xl p-4 sm:p-6">
	<div class="flex flex-wrap items-center gap-x-6 gap-y-4 lg:gap-x-8">
		<!-- Quality Presets - Hidden when lossless is enabled -->
		{#if !isLossless}
			<div class="flex items-center gap-3">
				<span class="text-sm font-medium text-surface-400 uppercase tracking-wide">Quality</span>
				<div class="flex gap-1.5">
					{#each presets as preset}
						<button
							onclick={() => handlePresetClick(preset.value)}
							class="px-3 py-1.5 text-sm font-medium rounded-lg transition-all {images.settings.quality === preset.value
								? 'bg-accent-start text-white shadow-md shadow-accent-start/30'
								: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
							title="{preset.desc} ({preset.value}%)"
						>
							{preset.label}
						</button>
					{/each}
				</div>
				{#if currentPreset}
					<span class="text-xs text-surface-500 tabular-nums">{currentPreset.value}%</span>
				{/if}
			</div>

			<!-- Divider -->
			<div class="hidden lg:block w-px h-6 bg-surface-700"></div>
		{/if}

		<!-- Output Format -->
		<div class="flex items-center gap-3">
			<Settings2 class="h-4 w-4 text-surface-400" />
			<div class="flex gap-1.5">
				{#each formats as format}
					<button
						onclick={() => handleFormatChange(format.value)}
						class="px-3 py-1.5 text-sm font-medium rounded-lg transition-all {images.settings.outputFormat === format.value
							? 'bg-accent-start text-white shadow-md shadow-accent-start/30'
							: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
					>
						{format.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Divider -->
		<div class="hidden lg:block w-px h-6 bg-surface-700"></div>

		<!-- Lossless Toggle -->
		<button
			onclick={handleLosslessToggle}
			class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all {isLossless ? 'text-accent-start bg-accent-start/10' : 'text-surface-400 hover:bg-surface-700/50'}"
			title={isLossless ? 'Lossless encoding (no quality loss)' : 'Lossy encoding (smaller files)'}
		>
			<Sparkles class="h-4 w-4" />
			<span class="text-sm font-medium">Lossless</span>
			<div
				class="relative h-5 w-9 rounded-full transition-colors {isLossless ? 'bg-accent-start' : 'bg-surface-600'}"
			>
				<span
					class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform {isLossless ? 'translate-x-4' : 'translate-x-0'}"
				></span>
			</div>
		</button>

		<!-- Divider -->
		<div class="hidden lg:block w-px h-6 bg-surface-700"></div>

		<!-- Strip Metadata Toggle -->
		<button
			onclick={handleMetadataToggle}
			class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all {images.settings.stripMetadata ? 'text-accent-start bg-accent-start/10' : 'text-surface-400 hover:bg-surface-700/50'}"
			title={images.settings.stripMetadata ? 'EXIF data will be removed' : 'EXIF data will be preserved'}
		>
			<Shield class="h-4 w-4" />
			<span class="text-sm font-medium">Strip EXIF</span>
			<div
				class="relative h-5 w-9 rounded-full transition-colors {images.settings.stripMetadata ? 'bg-accent-start' : 'bg-surface-600'}"
			>
				<span
					class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform {images.settings.stripMetadata ? 'translate-x-4' : 'translate-x-0'}"
				></span>
			</div>
		</button>

		<!-- Divider -->
		<div class="hidden lg:block w-px h-6 bg-surface-700"></div>

		<!-- Multi-scale Export (for SVG → raster) -->
		<div class="flex items-center gap-2">
			<Layers class="h-4 w-4 text-surface-400" />
			<span class="text-xs font-medium text-surface-500 uppercase tracking-wide">SVG Export</span>
			<div class="flex gap-1">
				<button
					onclick={handleExport2xToggle}
					class="px-2 py-1 text-xs font-bold rounded transition-all {export2x
						? 'bg-accent-start text-white'
						: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
					title="Also export @2x scale for retina displays"
				>
					@2x
				</button>
				<button
					onclick={handleExport3xToggle}
					class="px-2 py-1 text-xs font-bold rounded transition-all {export3x
						? 'bg-accent-start text-white'
						: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
					title="Also export @3x scale for high-DPI displays"
				>
					@3x
				</button>
			</div>
		</div>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Re-optimize Button -->
		{#if hasCompletedImages}
			<button
				onclick={handleReoptimizeAll}
				disabled={isReprocessing}
				class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-accent-start text-white shadow-md shadow-accent-start/30 hover:shadow-lg hover:shadow-accent-start/40 transition-all disabled:opacity-50"
			>
				<RefreshCw class="h-4 w-4 {isReprocessing ? 'animate-spin' : ''}" />
				{isReprocessing ? 'Working...' : 'Re-optimize All'}
			</button>
		{/if}
	</div>
</div>
