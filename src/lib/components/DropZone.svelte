<script lang="ts">
	import { Upload, ImageIcon, FileImage, Image, FileType, Film } from 'lucide-svelte';
	import { images } from '$lib/stores/images.svelte';
	import { processImages } from '$lib/utils/compress';

	let isDragging = $state(false);
	let fileInput: HTMLInputElement;

	const acceptedFormats = '.jpg,.jpeg,.png,.webp,.avif,.gif,.svg';
	const hasImages = $derived(images.items.length > 0);

	const formats = [
		{ name: 'JPEG', color: 'from-orange-500 to-red-500' },
		{ name: 'PNG', color: 'from-blue-500 to-indigo-500' },
		{ name: 'WebP', color: 'from-green-500 to-emerald-500' },
		{ name: 'AVIF', color: 'from-purple-500 to-pink-500' },
		{ name: 'GIF', color: 'from-yellow-500 to-orange-500' },
		{ name: 'SVG', color: 'from-cyan-500 to-blue-500' }
	];

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = e.clientX;
		const y = e.clientY;
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			isDragging = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			const newItems = images.addFiles(files);
			if (newItems.length > 0) {
				await processImages(newItems.map((i) => i.id));
			}
		}
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (files && files.length > 0) {
			const newItems = images.addFiles(files);
			if (newItems.length > 0) {
				await processImages(newItems.map((i) => i.id));
			}
		}
		input.value = '';
	}

	function openFilePicker() {
		fileInput?.click();
	}
</script>

<div
	class="relative"
	role="button"
	tabindex="0"
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	onclick={openFilePicker}
	onkeydown={(e) => e.key === 'Enter' && openFilePicker()}
>
	<input
		bind:this={fileInput}
		type="file"
		accept={acceptedFormats}
		multiple
		class="hidden"
		onchange={handleFileSelect}
	/>

	{#if hasImages}
		<!-- Compact dropzone when images exist -->
		<div
			class="group flex items-center justify-center gap-3 rounded-xl border-2 border-dashed py-3 px-4 transition-all duration-300 cursor-pointer {isDragging
				? 'border-accent-start bg-accent-start/5'
				: 'border-surface-300 hover:border-accent-start/50 dark:border-surface-700'}"
		>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800 transition-colors group-hover:bg-accent-start/10">
				{#if isDragging}
					<FileImage class="h-4 w-4 text-accent-start animate-pulse" />
				{:else}
					<Upload class="h-4 w-4 text-surface-400 group-hover:text-accent-start" />
				{/if}
			</div>
			<p class="text-sm text-surface-500">
				{#if isDragging}
					<span class="font-medium text-accent-start">Release to add more</span>
				{:else}
					Drop more images or <span class="font-medium text-accent-start">click to browse</span>
				{/if}
			</p>
		</div>
	{:else}
		<!-- Full dropzone when no images -->
		<div
			class="group relative overflow-hidden rounded-2xl border-2 border-dashed py-8 transition-all duration-300 cursor-pointer {isDragging
				? 'border-accent-start bg-accent-start/5 scale-[1.02]'
				: 'border-surface-300 hover:border-accent-start/50 dark:border-surface-700 dark:hover:border-accent-start/50'}"
		>
			<!-- Background pattern -->
			<div
				class="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
				style="background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;);"
			></div>

			<div class="relative flex flex-col items-center justify-center px-6 text-center">
				<!-- Icon -->
				<div
					class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 {isDragging
						? 'bg-accent-start/20 scale-110 rotate-3'
						: 'bg-surface-100 group-hover:bg-accent-start/10 dark:bg-surface-800 group-hover:scale-105'}"
				>
					{#if isDragging}
						<FileImage class="h-6 w-6 text-accent-start animate-pulse" />
					{:else}
						<Upload
							class="h-6 w-6 text-surface-400 transition-all group-hover:text-accent-start group-hover:-translate-y-1"
						/>
					{/if}
				</div>

				<!-- Text -->
				{#if isDragging}
					<p class="font-semibold text-accent-start">Release to upload</p>
					<p class="mt-0.5 text-sm text-accent-start/70">Your images are ready to be optimized</p>
				{:else}
					<p class="font-semibold text-surface-700 dark:text-surface-300">Drop images here</p>
					<p class="mt-0.5 text-sm text-surface-500">
						or <span class="font-medium text-accent-start underline-offset-2 hover:underline">click to browse</span>
					</p>
				{/if}

				<!-- Supported formats -->
				<div class="mt-4 flex flex-wrap items-center justify-center gap-1.5">
					{#each formats as format}
						<span
							class="rounded bg-gradient-to-r {format.color} px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm transition-transform hover:scale-105"
						>
							{format.name}
						</span>
					{/each}
				</div>
				<p class="mt-3 text-xs text-surface-400">
					Max file size: Unlimited • Batch upload supported
				</p>
			</div>
		</div>
	{/if}
</div>
