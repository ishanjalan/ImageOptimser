import { images, type ImageFormat, type ImageItem } from '$lib/stores/images.svelte';
import { optimize } from 'svgo';
import { processImage as processImageInWorker, initPool } from './worker-pool';

// Processing state
let isProcessing = false;
const queue: string[] = [];

export async function processImages(ids: string[]) {
	queue.push(...ids);
	if (!isProcessing) {
		processQueue();
	}
}

async function processQueue() {
	if (queue.length === 0) {
		isProcessing = false;
		return;
	}

	isProcessing = true;

	// Initialize worker pool once
	await initPool();

	// Process all items in parallel using the worker pool
	const processingPromises: Promise<void>[] = [];

	while (queue.length > 0) {
		const id = queue.shift()!;
		const item = images.getItemById(id);
		if (item && item.status === 'pending') {
			processingPromises.push(compressImage(item));
		}
	}

	// Wait for all current batch to complete
	await Promise.all(processingPromises);

	isProcessing = false;

	// Check if more items were added while processing
	if (queue.length > 0) {
		processQueue();
	}
}

async function compressImage(item: ImageItem) {
	try {
		images.updateItem(item.id, { status: 'processing', progress: 10 });

		const quality = images.settings.quality;
		const outputFormat = item.outputFormat;

		let compressedBlob: Blob;

		if (item.format === 'svg' && outputFormat === 'svg') {
			// SVG optimization stays on main thread (SVGO is JS, not WASM)
			compressedBlob = await optimizeSvg(item.file);
			images.updateItem(item.id, { progress: 90 });
		} else {
			// Use worker pool for WASM-based compression
			const imageBuffer = await item.file.arrayBuffer();

			const { result, mimeType } = await processImageInWorker(
				item.id,
				imageBuffer,
				item.format,
				outputFormat,
				quality,
				(progress) => {
					images.updateItem(item.id, { progress });
				}
			);

			compressedBlob = new Blob([result], { type: mimeType });
		}

		// Create URL for preview
		const compressedUrl = URL.createObjectURL(compressedBlob);

		images.updateItem(item.id, {
			status: 'completed',
			progress: 100,
			compressedSize: compressedBlob.size,
			compressedUrl,
			compressedBlob
		});
	} catch (error) {
		console.error('Compression error:', error);
		images.updateItem(item.id, {
			status: 'error',
			error: error instanceof Error ? error.message : 'Compression failed'
		});
	}
}

async function optimizeSvg(file: File): Promise<Blob> {
	const text = await file.text();

	const result = optimize(text, {
		multipass: true,
		plugins: [
			'preset-default',
			{
				name: 'removeAttrs',
				params: {
					attrs: ['data-name']
				}
			}
		]
	});

	return new Blob([result.data], { type: 'image/svg+xml' });
}

function getMimeType(format: ImageFormat): string {
	const map: Record<ImageFormat, string> = {
		jpeg: 'image/jpeg',
		png: 'image/png',
		webp: 'image/webp',
		avif: 'image/avif',
		svg: 'image/svg+xml'
	};
	return map[format];
}

export function getOutputExtension(format: ImageFormat): string {
	const map: Record<ImageFormat, string> = {
		jpeg: '.jpg',
		png: '.png',
		webp: '.webp',
		avif: '.avif',
		svg: '.svg'
	};
	return map[format];
}

export function getOutputFilename(originalName: string, format: ImageFormat): string {
	const baseName = originalName.replace(/\.[^/.]+$/, '');
	return `${baseName}-optimized${getOutputExtension(format)}`;
}

// Re-process a single image with a new output format
export async function reprocessImage(id: string, newFormat: ImageFormat) {
	const item = images.getItemById(id);
	if (!item) return;

	// Clean up old compressed URL
	if (item.compressedUrl) {
		URL.revokeObjectURL(item.compressedUrl);
	}

	// Update the item with new format and reset status
	images.updateItem(id, {
		outputFormat: newFormat,
		status: 'pending',
		progress: 0,
		compressedSize: undefined,
		compressedUrl: undefined,
		compressedBlob: undefined
	});

	// Initialize worker pool if needed
	await initPool();

	// Get fresh item reference
	const updatedItem = images.getItemById(id);
	if (updatedItem) {
		await compressImage(updatedItem);
	}
}

// Re-process all completed images with current settings
export async function reprocessAllImages() {
	const completedItems = images.items.filter(i => i.status === 'completed');
	
	if (completedItems.length === 0) return;

	// Reset all completed items to pending
	for (const item of completedItems) {
		if (item.compressedUrl) {
			URL.revokeObjectURL(item.compressedUrl);
		}
		
		// Determine output format based on settings
		const outputFormat = images.settings.outputFormat === 'same' 
			? item.format 
			: images.settings.outputFormat;
		
		images.updateItem(item.id, {
			outputFormat,
			status: 'pending',
			progress: 0,
			compressedSize: undefined,
			compressedUrl: undefined,
			compressedBlob: undefined
		});
	}

	// Initialize worker pool
	await initPool();

	// Process all items in parallel
	const processingPromises = completedItems.map(item => {
		const updatedItem = images.getItemById(item.id);
		if (updatedItem && updatedItem.status === 'pending') {
			return compressImage(updatedItem);
		}
		return Promise.resolve();
	});

	await Promise.all(processingPromises);
}
