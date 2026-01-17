<script lang="ts">
	import { images, formatBytes } from '$lib';
	import { downloadAllAsZip } from '$lib/utils/download';
	import { toast } from './Toast.svelte';
	import AnimatedNumber from './AnimatedNumber.svelte';
	import { Download, Clock, Zap, HardDrive, TrendingDown, X, CheckCircle } from 'lucide-svelte';
	import { scale, fade } from 'svelte/transition';

	let { onclose }: { onclose: () => void } = $props();

	const completedItems = $derived(images.items.filter(i => i.status === 'completed'));
	const stats = $derived(images.batchStats);

	// Calculate stats
	const totalOriginalSize = $derived(
		completedItems.reduce((acc, i) => acc + i.originalSize, 0)
	);
	const totalCompressedSize = $derived(
		completedItems.reduce((acc, i) => acc + (i.compressedSize || 0), 0)
	);
	const totalSaved = $derived(totalOriginalSize - totalCompressedSize);
	const savingsPercent = $derived(
		totalOriginalSize > 0 ? Math.round((totalSaved / totalOriginalSize) * 100) : 0
	);

	const processingTime = $derived(
		stats.startTime && stats.endTime ? (stats.endTime - stats.startTime) / 1000 : 0
	);
	const imagesPerSecond = $derived(
		processingTime > 0 ? (completedItems.length / processingTime).toFixed(1) : '0'
	);
	const avgTimePerImage = $derived(
		completedItems.length > 0 ? Math.round((processingTime / completedItems.length) * 1000) : 0
	);

	function formatTime(seconds: number): string {
		if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
		if (seconds < 60) return `${seconds.toFixed(1)}s`;
		const mins = Math.floor(seconds / 60);
		const secs = (seconds % 60).toFixed(0);
		return `${mins}m ${secs}s`;
	}

	async function handleDownloadAll() {
		if (completedItems.length > 0) {
			await downloadAllAsZip(completedItems);
			const savedFormatted = formatBytes(totalSaved);
			toast.success(`Downloaded ${completedItems.length} ${completedItems.length === 1 ? 'image' : 'images'} as ZIP (${savedFormatted} saved!)`);
		}
	}
</script>

{#if completedItems.length > 0 && stats.endTime}
	<div
		class="glass mb-6 sm:mb-8 rounded-2xl overflow-hidden"
		in:scale={{ duration: 300, start: 0.95 }}
		out:fade={{ duration: 150 }}
	>
		<!-- Header -->
		<div class="bg-gradient-to-r from-accent-start/20 to-accent-end/20 px-5 py-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
					<CheckCircle class="h-5 w-5 text-green-500" />
				</div>
				<div>
					<h3 class="font-semibold text-surface-100">Batch Complete!</h3>
					<p class="text-sm text-surface-400">{completedItems.length} {completedItems.length === 1 ? 'image' : 'images'} optimized</p>
				</div>
			</div>
			<button
				onclick={onclose}
				class="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200"
				aria-label="Dismiss summary"
			>
				<X class="h-5 w-5" />
			</button>
		</div>

		<!-- Stats Grid -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
			<!-- Total Saved -->
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/10">
					<TrendingDown class="h-5 w-5 text-green-500" />
				</div>
				<div>
					<p class="text-xs text-surface-400 uppercase tracking-wide">Saved</p>
					<p class="text-lg font-bold text-green-500"><AnimatedNumber value={totalSaved} format={formatBytes} duration={800} /></p>
					<p class="text-xs text-surface-500">-<AnimatedNumber value={savingsPercent} format={(n) => Math.round(n).toString()} />%</p>
				</div>
			</div>

			<!-- Processing Time -->
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent-start/10">
					<Clock class="h-5 w-5 text-accent-start" />
				</div>
				<div>
					<p class="text-xs text-surface-400 uppercase tracking-wide">Time</p>
					<p class="text-lg font-bold text-surface-100"><AnimatedNumber value={processingTime} format={formatTime} duration={800} /></p>
					<p class="text-xs text-surface-500"><AnimatedNumber value={avgTimePerImage} format={(n) => Math.round(n).toString()} />ms avg</p>
				</div>
			</div>

			<!-- Speed -->
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
					<Zap class="h-5 w-5 text-amber-500" />
				</div>
				<div>
					<p class="text-xs text-surface-400 uppercase tracking-wide">Speed</p>
					<p class="text-lg font-bold text-surface-100"><AnimatedNumber value={parseFloat(imagesPerSecond)} format={(n) => n.toFixed(1)} duration={800} /></p>
					<p class="text-xs text-surface-500">images/sec</p>
				</div>
			</div>

			<!-- Final Size -->
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
					<HardDrive class="h-5 w-5 text-blue-500" />
				</div>
				<div>
					<p class="text-xs text-surface-400 uppercase tracking-wide">Final Size</p>
					<p class="text-lg font-bold text-surface-100"><AnimatedNumber value={totalCompressedSize} format={formatBytes} duration={800} /></p>
					<p class="text-xs text-surface-500">from {formatBytes(totalOriginalSize)}</p>
				</div>
			</div>
		</div>

		<!-- Download Button -->
		<div class="border-t border-surface-700/50 px-5 py-4 flex justify-end">
			<button
				onclick={handleDownloadAll}
				class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-start to-accent-end px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent-start/30 transition-all hover:shadow-xl hover:shadow-accent-start/40 hover:scale-105"
			>
				<Download class="h-5 w-5" />
				Download All ({completedItems.length})
			</button>
		</div>
	</div>
{/if}
