<script lang="ts">
	import { Upload, ImageIcon, FileImage } from 'lucide-svelte';
	import { images } from '$lib/stores/images.svelte';
	import { processImages } from '$lib/utils/compress';

	let isDragging = $state(false);
	let fileInput: HTMLInputElement;

	const acceptedFormats = '.jpg,.jpeg,.png,.webp,.avif,.gif,.svg';
	const hasImages = $derived(images.items.length > 0);

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		// Only set to false if we're leaving the drop zone entirely
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
		// Reset input so the same file can be selected again
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

	<div
		class="group relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 {isDragging
			? 'border-accent-start bg-accent-start/5 scale-[1.02]'
			: 'border-surface-300 hover:border-accent-start/50 dark:border-surface-700'} {hasImages
			? 'py-8'
			: 'py-16 md:py-24'}"
	>
		<!-- Background pattern -->
		<div
			class="absolute inset-0 opacity-5 dark:opacity-10"
			style="background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;);"
		></div>

		<div class="relative flex flex-col items-center justify-center px-6 text-center">
			<!-- Icon -->
			<div
				class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-300 {isDragging
					? 'bg-accent-start/20 scale-110'
					: 'bg-surface-100 group-hover:bg-accent-start/10 dark:bg-surface-800'}"
			>
				{#if isDragging}
					<FileImage class="h-10 w-10 text-accent-start animate-pulse" />
				{:else}
					<Upload
						class="h-10 w-10 text-surface-400 transition-all group-hover:text-accent-start group-hover:-translate-y-1"
					/>
				{/if}
			</div>

			<!-- Text -->
			{#if isDragging}
				<p class="text-xl font-semibold text-accent-start">Drop your images here</p>
			{:else}
				<p class="text-xl font-semibold text-surface-700 dark:text-surface-300">
					{hasImages ? 'Add more images' : 'Drop images here'}
				</p>
				<p class="mt-2 text-surface-500">
					or <span
						class="font-medium text-accent-start underline-offset-2 hover:underline cursor-pointer"
						>browse files</span
					>
				</p>
			{/if}

			<!-- Supported formats -->
			{#if !hasImages}
				<div class="mt-6 flex flex-wrap items-center justify-center gap-2">
					{#each ['JPEG', 'PNG', 'WebP', 'AVIF', 'GIF', 'SVG'] as format}
						<span
							class="rounded-lg bg-surface-100 px-3 py-1.5 text-xs font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-400"
						>
							{format}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
