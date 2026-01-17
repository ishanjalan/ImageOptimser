<script lang="ts">
	import { images, type OutputFormat, type ResizeMode } from '$lib/stores/images.svelte';
	import { reprocessAllImages } from '$lib/utils/compress';
	import { Settings2, Shield, RefreshCw, Sparkles, Layers, Sliders, Target, ChevronDown, ChevronUp, Info, Maximize2 } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import FormatGuide from './FormatGuide.svelte';
	import ConfirmModal from './ConfirmModal.svelte';

	const ADVANCED_COLLAPSED_KEY = 'squish-advanced-collapsed';
	let showFormatGuide = $state(false);
	let showReoptimizeConfirm = $state(false);

	// Check if we're in preview mode (no images yet)
	const isPreviewMode = $derived(images.items.length === 0);

	// Load collapsed state from localStorage
	let showAdvanced = $state(true);
	if (typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem(ADVANCED_COLLAPSED_KEY);
		showAdvanced = saved !== 'true';
	}

	const formats: { value: 'same' | OutputFormat; label: string; title?: string }[] = [
		{ value: 'same', label: 'Original', title: 'Keep same format as input' },
		{ value: 'jpeg', label: 'JPEG' },
		{ value: 'png', label: 'PNG' },
		{ value: 'webp', label: 'WebP' },
		{ value: 'avif', label: 'AVIF' }
	];

	// Quality presets based on common use cases
	const presets = [
		{ label: 'Tiny', value: 50, desc: 'Maximum compression', recommended: false },
		{ label: 'Web', value: 75, desc: 'Recommended for most uses', recommended: true },
		{ label: 'Social', value: 85, desc: 'Instagram, Twitter, Facebook', recommended: false },
		{ label: 'High', value: 92, desc: 'Print-ready quality', recommended: false },
		{ label: 'Max', value: 98, desc: 'Near-lossless quality', recommended: false }
	];

	// Target size presets
	const sizePresets = [
		{ label: '100 KB', value: 100 },
		{ label: '250 KB', value: 250 },
		{ label: '500 KB', value: 500 },
		{ label: '1 MB', value: 1024 },
		{ label: '2 MB', value: 2048 }
	];

	let isReprocessing = $state(false);
	let customSizeInput = $state('');
	
	const hasCompletedImages = $derived(images.items.some(i => i.status === 'completed'));
	const isLossless = $derived(images.settings.lossless);
	const isTargetSizeMode = $derived(images.settings.targetSizeMode);
	const targetSizeKB = $derived(images.settings.targetSizeKB);
	const export2x = $derived(images.settings.export2x);
	const export3x = $derived(images.settings.export3x);
	const hasScaleExport = $derived(export2x || export3x);
	// Resize settings
	const resizeEnabled = $derived(images.settings.resizeEnabled);
	const resizeMode = $derived(images.settings.resizeMode);
	const resizePercentage = $derived(images.settings.resizePercentage);
	const resizeMaxWidth = $derived(images.settings.resizeMaxWidth);
	const resizeMaxHeight = $derived(images.settings.resizeMaxHeight);
	const maintainAspectRatio = $derived(images.settings.maintainAspectRatio);
	// Only show SVG export options when there are SVG files that will be converted to raster
	const hasSvgToRaster = $derived(
		images.items.some(i => i.format === 'svg' && i.outputFormat !== 'svg')
	);

	// Check if current target size matches a preset
	const currentSizePreset = $derived(sizePresets.find(p => p.value === targetSizeKB));

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

	function handleModeToggle(targetSize: boolean) {
		images.updateSettings({ targetSizeMode: targetSize });
	}

	function handleSizePresetClick(value: number) {
		images.updateSettings({ targetSizeKB: value });
		customSizeInput = '';
	}

	function handleCustomSizeChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const value = parseInt(input.value, 10);
		if (!isNaN(value) && value > 0) {
			images.updateSettings({ targetSizeKB: value });
		}
	}

	function toggleAdvanced() {
		showAdvanced = !showAdvanced;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(ADVANCED_COLLAPSED_KEY, (!showAdvanced).toString());
		}
	}

	function handleResizeToggle() {
		images.updateSettings({ resizeEnabled: !images.settings.resizeEnabled });
	}

	function handleResizeModeChange(mode: ResizeMode) {
		images.updateSettings({ resizeMode: mode });
	}

	function handleResizePercentageChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const value = parseInt(input.value, 10);
		if (!isNaN(value) && value > 0 && value <= 100) {
			images.updateSettings({ resizePercentage: value });
		}
	}

	function handleResizeWidthChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const value = parseInt(input.value, 10);
		if (!isNaN(value) && value > 0) {
			images.updateSettings({ resizeMaxWidth: value });
		}
	}

	function handleResizeHeightChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const value = parseInt(input.value, 10);
		if (!isNaN(value) && value > 0) {
			images.updateSettings({ resizeMaxHeight: value });
		}
	}

	function handleAspectRatioToggle() {
		images.updateSettings({ maintainAspectRatio: !images.settings.maintainAspectRatio });
	}

	function handleReoptimizeClick() {
		const count = images.items.filter(i => i.status === 'completed').length;
		if (count > 5) {
			showReoptimizeConfirm = true;
		} else {
			handleReoptimizeAll();
		}
	}

	async function handleReoptimizeAll() {
		showReoptimizeConfirm = false;
		isReprocessing = true;
		await reprocessAllImages();
		isReprocessing = false;
	}

	const currentPreset = $derived(presets.find(p => p.value === images.settings.quality));
</script>

<div class="glass mb-6 sm:mb-8 rounded-2xl p-4 sm:p-6">
	<div class="flex flex-col gap-4">
		<!-- Preview mode header -->
		{#if isPreviewMode}
			<div class="flex items-center gap-2 text-surface-400 -mb-1">
				<Sliders class="h-4 w-4" />
				<span class="text-xs font-medium uppercase tracking-wider">Pre-configure compression settings</span>
			</div>
		{/if}
		
		<!-- Row 1: Compression & Format -->
		<div class="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4 sm:gap-x-6 sm:gap-y-4">
			<!-- Compression Section -->
			<div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
				<span class="text-xs font-semibold text-surface-500 uppercase tracking-wider">Compression</span>
				
				<div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-800/50">
					<!-- Mode Toggle: Quality vs Size -->
					<div class="flex gap-0.5 p-0.5 rounded-lg bg-surface-700/50">
						<button
							onclick={() => handleModeToggle(false)}
							class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all {!isTargetSizeMode
								? 'bg-surface-600 text-white shadow-sm'
								: 'text-surface-400 hover:text-surface-200'}"
							title="Set quality level"
						>
							<Sparkles class="h-3 w-3" />
							Quality
						</button>
						<button
							onclick={() => handleModeToggle(true)}
							class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all {isTargetSizeMode
								? 'bg-surface-600 text-white shadow-sm'
								: 'text-surface-400 hover:text-surface-200'}"
							title="Set target file size"
						>
							<Target class="h-3 w-3" />
							Size
						</button>
					</div>

					<div class="w-px h-5 bg-surface-600 mx-1"></div>

					{#if !isTargetSizeMode}
						<!-- Quality Mode -->
						{#if !isLossless}
							<div class="flex flex-wrap gap-1">
								{#each presets as preset}
									<button
										onclick={() => handlePresetClick(preset.value)}
										class="relative px-2 sm:px-3 py-2 text-sm font-medium rounded-md transition-all {images.settings.quality === preset.value
											? 'bg-accent-start text-white shadow-sm'
											: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
										title="{preset.desc} ({preset.value}%)"
									>
										{preset.label}
										{#if preset.recommended && images.settings.quality !== preset.value}
											<span class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent-start"></span>
										{/if}
									</button>
								{/each}
							</div>
							{#if currentPreset}
								<span class="text-xs text-surface-500 tabular-nums ml-1 hidden sm:inline">{currentPreset.value}%</span>
							{/if}
						{:else}
							<span class="text-xs text-surface-500 italic">Quality disabled in lossless mode</span>
						{/if}
					{:else}
						<!-- Target Size Mode -->
						<div class="flex flex-wrap gap-1">
							{#each sizePresets as preset}
								<button
									onclick={() => handleSizePresetClick(preset.value)}
									class="px-2.5 py-2 text-sm font-medium rounded-md transition-all {targetSizeKB === preset.value
										? 'bg-accent-start text-white shadow-sm'
										: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
								>
									{preset.label}
								</button>
							{/each}
						</div>
						<div class="w-px h-5 bg-surface-600 mx-1"></div>
						<!-- Custom size input -->
						<div class="flex items-center gap-1.5">
							<input
								type="number"
								min="10"
								max="10000"
								placeholder="Custom"
								value={currentSizePreset ? '' : targetSizeKB}
								onchange={handleCustomSizeChange}
								class="w-20 px-2 py-1.5 text-sm font-medium rounded-md bg-surface-700 text-surface-200 placeholder:text-surface-500 border border-surface-600 focus:border-accent-start focus:outline-none"
							/>
							<span class="text-xs text-surface-500">KB</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Divider -->
			<div class="hidden md:block w-px h-8 bg-surface-700/50"></div>

			<!-- Format Section -->
			<div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
				<div class="flex items-center gap-1.5">
					<span class="text-xs font-semibold text-surface-500 uppercase tracking-wider">Format</span>
					<button
						onclick={() => showFormatGuide = true}
						class="flex h-5 w-5 items-center justify-center rounded-full text-surface-400 hover:text-accent-start hover:bg-accent-start/10 transition-colors"
						title="Format guide"
						aria-label="Open format guide"
					>
						<Info class="h-3.5 w-3.5" />
					</button>
				</div>
				<div class="flex flex-wrap gap-1 px-2 py-1.5 rounded-xl bg-surface-800/50">
					{#each formats as format}
						<button
							onclick={() => handleFormatChange(format.value)}
							class="min-h-[44px] px-3 py-2 text-sm font-medium rounded-md transition-all {images.settings.outputFormat === format.value
								? 'bg-accent-start text-white shadow-sm'
								: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
							title={format.title}
						>
							{format.label}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Row 2: Advanced Options Toggle + Re-optimize -->
		<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
			<!-- Advanced Options Toggle - minimum 44px touch target -->
			<button
				onclick={toggleAdvanced}
				class="flex items-center gap-2 min-h-[44px] py-2 text-xs font-medium text-surface-400 hover:text-surface-200 transition-colors"
			>
				{#if showAdvanced}
					<ChevronUp class="h-4 w-4" />
				{:else}
					<ChevronDown class="h-4 w-4" />
				{/if}
				<span class="uppercase tracking-wider">Advanced Options</span>
				{#if !showAdvanced}
					<span class="text-surface-500 hidden sm:inline">
						({images.settings.stripMetadata ? 'Metadata stripped' : 'Metadata kept'}{isLossless && !isTargetSizeMode ? ', Lossless' : ''})
					</span>
				{/if}
			</button>

			<!-- Re-optimize Button -->
			{#if hasCompletedImages}
				<button
					onclick={handleReoptimizeClick}
					disabled={isReprocessing}
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-accent-start text-white shadow-md shadow-accent-start/30 hover:shadow-lg hover:shadow-accent-start/40 transition-all disabled:opacity-50"
				>
					<RefreshCw class="h-4 w-4 {isReprocessing ? 'animate-spin' : ''}" />
					{isReprocessing ? 'Working...' : 'Re-optimize All'}
				</button>
			{/if}
		</div>

		<!-- Advanced Options Section (Collapsible) -->
		{#if showAdvanced}
			<div 
				class="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3 border-t border-surface-700/30"
				transition:slide={{ duration: 200 }}
			>
				<!-- Strip Metadata Toggle -->
				<button
					onclick={handleMetadataToggle}
					class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all {images.settings.stripMetadata ? 'text-accent-start bg-accent-start/10' : 'text-surface-400 hover:bg-surface-700/30'}"
					title={images.settings.stripMetadata ? 'Location, camera info, timestamps will be removed' : 'Metadata will be preserved (may include location)'}
				>
					<Shield class="h-4 w-4" />
					<div class="flex flex-col items-start">
						<span class="text-sm font-medium">Strip Metadata</span>
						<span class="text-[10px] text-surface-500">Location, camera, timestamps</span>
					</div>
					<div
						class="relative h-5 w-9 rounded-full transition-colors {images.settings.stripMetadata ? 'bg-accent-start' : 'bg-surface-600'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform {images.settings.stripMetadata ? 'translate-x-4' : 'translate-x-0'}"
						></span>
					</div>
				</button>

				<!-- Lossless Toggle (only in Quality mode) -->
				{#if !isTargetSizeMode}
					<button
						onclick={handleLosslessToggle}
						class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all {isLossless ? 'text-accent-start bg-accent-start/10' : 'text-surface-400 hover:bg-surface-700/30'}"
						title={isLossless ? 'No quality loss, larger files' : 'Smaller files, slight quality reduction'}
					>
						<Sparkles class="h-4 w-4" />
						<div class="flex flex-col items-start">
							<span class="text-sm font-medium">Lossless</span>
							<span class="text-[10px] text-surface-500">{isLossless ? 'No quality loss' : 'Larger files'}</span>
						</div>
						<div
							class="relative h-5 w-9 rounded-full transition-colors {isLossless ? 'bg-accent-start' : 'bg-surface-600'}"
						>
							<span
								class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform {isLossless ? 'translate-x-4' : 'translate-x-0'}"
							></span>
						</div>
					</button>
				{/if}

				<!-- Resize Toggle + Controls -->
				<div class="flex items-center gap-3 px-3 py-2 rounded-lg {resizeEnabled ? 'bg-accent-start/10' : 'bg-surface-800/30'}">
					<button
						onclick={handleResizeToggle}
						class="flex items-center gap-2 transition-all {resizeEnabled ? 'text-accent-start' : 'text-surface-400 hover:text-surface-300'}"
					>
						<Maximize2 class="h-4 w-4" />
						<div class="flex flex-col items-start">
							<span class="text-sm font-medium">Resize</span>
							<span class="text-[10px] text-surface-500">Scale images</span>
						</div>
						<div
							class="relative h-5 w-9 rounded-full transition-colors {resizeEnabled ? 'bg-accent-start' : 'bg-surface-600'}"
						>
							<span
								class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform {resizeEnabled ? 'translate-x-4' : 'translate-x-0'}"
							></span>
						</div>
					</button>
					
					{#if resizeEnabled}
						<div class="flex items-center gap-3 ml-3 pl-3 border-l border-surface-600">
							<!-- Mode selector -->
							<div class="flex gap-0.5 p-0.5 rounded-md bg-surface-700/50">
								<button
									onclick={() => handleResizeModeChange('percentage')}
									class="px-2 py-1 text-xs font-medium rounded transition-all {resizeMode === 'percentage' ? 'bg-surface-600 text-white' : 'text-surface-400 hover:text-surface-200'}"
								>
									Scale %
								</button>
								<button
									onclick={() => handleResizeModeChange('fit')}
									class="px-2 py-1 text-xs font-medium rounded transition-all {resizeMode === 'fit' ? 'bg-surface-600 text-white' : 'text-surface-400 hover:text-surface-200'}"
								>
									Max Size
								</button>
							</div>
							
							{#if resizeMode === 'percentage'}
								<div class="flex items-center gap-1.5">
									<input
										type="number"
										min="10"
										max="100"
										value={resizePercentage}
										onchange={handleResizePercentageChange}
										class="w-16 px-2 py-1 text-sm font-medium rounded-md bg-surface-700 text-surface-200 border border-surface-600 focus:border-accent-start focus:outline-none"
									/>
									<span class="text-xs text-surface-500">%</span>
								</div>
							{:else}
								<div class="flex items-center gap-1.5">
									<input
										type="number"
										min="100"
										max="10000"
										value={resizeMaxWidth}
										onchange={handleResizeWidthChange}
										class="w-20 px-2 py-1 text-sm font-medium rounded-md bg-surface-700 text-surface-200 border border-surface-600 focus:border-accent-start focus:outline-none"
									/>
									<span class="text-xs text-surface-500">×</span>
									<input
										type="number"
										min="100"
										max="10000"
										value={resizeMaxHeight}
										onchange={handleResizeHeightChange}
										class="w-20 px-2 py-1 text-sm font-medium rounded-md bg-surface-700 text-surface-200 border border-surface-600 focus:border-accent-start focus:outline-none"
									/>
									<span class="text-xs text-surface-500">px</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Multi-scale Export (only shown for SVG → raster conversions) -->
				{#if hasSvgToRaster}
					<div class="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-800/30">
						<Layers class="h-4 w-4 text-surface-400" />
						<div class="flex flex-col items-start">
							<span class="text-sm font-medium text-surface-300">SVG Scale Export</span>
							<span class="text-[10px] text-surface-500">Generate @2x and @3x versions</span>
						</div>
						<div class="flex gap-1 ml-2">
							<button
								onclick={handleExport2xToggle}
								class="px-3 py-1.5 text-xs font-bold rounded-md transition-all {export2x
									? 'bg-accent-start text-white'
									: 'text-surface-400 bg-surface-700/50 hover:text-surface-200'}"
								title="Also export @2x scale for retina displays"
							>
								@2x
							</button>
							<button
								onclick={handleExport3xToggle}
								class="px-3 py-1.5 text-xs font-bold rounded-md transition-all {export3x
									? 'bg-accent-start text-white'
									: 'text-surface-400 bg-surface-700/50 hover:text-surface-200'}"
								title="Also export @3x scale for high-DPI displays"
							>
								@3x
							</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Format Guide Modal -->
<FormatGuide open={showFormatGuide} onclose={() => showFormatGuide = false} />

<!-- Re-optimize Confirmation Modal -->
<ConfirmModal
	open={showReoptimizeConfirm}
	title="Re-optimize all images?"
	message="This will re-process {images.items.filter(i => i.status === 'completed').length} images with the current settings. This may take a moment."
	confirmText="Re-optimize"
	onconfirm={handleReoptimizeAll}
	oncancel={() => showReoptimizeConfirm = false}
/>
