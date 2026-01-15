import { images, type OutputFormat, type ImageItem } from '$lib/stores/images.svelte';
import { optimize } from 'svgo';
import { processImage as processImageInWorker, initPool } from './worker-pool';
import heic2any from 'heic2any';

// Threshold: warn if WebP would be this many times smaller than SVG
const SVG_WEBP_WARNING_RATIO = 3;

// Processing state
let isProcessing = false;
const queue: string[] = [];

export async function processImages(ids: string[]) {
	// Start batch timing if this is a new batch
	if (!isProcessing && ids.length > 0) {
		images.startBatch(ids.length);
	} else if (isProcessing) {
		// Adding to existing batch - update total count
		const currentTotal = images.batchStats.totalImages;
		images.startBatch(currentTotal + ids.length);
	}

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
	} else {
		// All done - record end time
		images.endBatch();
	}
}

// Convert HEIC to PNG using heic2any (libheif WASM decoder)
async function convertHeicToPng(file: File): Promise<{ blob: Blob; width: number; height: number }> {
	const result = await heic2any({
		blob: file,
		toType: 'image/png', // Lossless intermediate format
		quality: 1
	});

	// heic2any can return single blob or array
	const pngBlob = Array.isArray(result) ? result[0] : result;

	// Get dimensions from the converted PNG
	const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(pngBlob);
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to get HEIC dimensions'));
		};
		img.src = url;
	});

	return { blob: pngBlob, ...dimensions };
}

async function compressImage(item: ImageItem) {
	try {
		images.updateItem(item.id, { status: 'processing', progress: 5 });

		const quality = images.settings.quality;
		const lossless = images.settings.lossless;
		const maxDimension = images.settings.maxDimension;
		const outputFormat = item.outputFormat;

		let compressedBlob: Blob;
		let finalWidth: number | undefined;
		let finalHeight: number | undefined;

		if (item.format === 'svg' && outputFormat === 'svg') {
			// SVG → SVG: Optimize with SVGO
			compressedBlob = await optimizeSvg(item.file);
			images.updateItem(item.id, { progress: 70 });
			
			// Compute WebP alternative for complex SVG warning
			// Only if the optimized SVG is still reasonably large (>5KB)
			if (compressedBlob.size > 5000) {
				const webpSize = await computeWebpSize(item.file, quality);
				// If WebP is significantly smaller, store for warning display
				if (webpSize > 0 && compressedBlob.size > webpSize * SVG_WEBP_WARNING_RATIO) {
					images.updateItem(item.id, { webpAlternativeSize: webpSize });
				}
			}
			images.updateItem(item.id, { progress: 90 });
		} else if (item.format === 'svg' && outputFormat !== 'svg') {
			// SVG → Raster: Render to canvas, then process through worker
			images.updateItem(item.id, { progress: 10 });
			
			const { blob: pngBlob, width, height } = await renderSvgToRaster(item.file);
			
			// Update dimensions if we didn't have them
			if (!item.width || !item.height) {
				images.updateItem(item.id, { width, height });
			}
			
			images.updateItem(item.id, { progress: 30 });
			
			const imageBuffer = await pngBlob.arrayBuffer();
			
			const { result, mimeType, newWidth, newHeight } = await processImageInWorker(
				item.id,
				imageBuffer,
				'png', // Treat rasterized SVG as PNG for the worker
				outputFormat,
				quality,
				lossless,
				maxDimension,
				(progress) => {
					const scaledProgress = 30 + (progress * 0.6);
					images.updateItem(item.id, { progress: scaledProgress });
				}
			);
			
			compressedBlob = new Blob([result], { type: mimeType });
			finalWidth = newWidth;
			finalHeight = newHeight;
		} else if (item.format === 'heic') {
			// HEIC: Convert to PNG first, then process
			images.updateItem(item.id, { progress: 10 });
			
			const { blob: pngBlob, width, height } = await convertHeicToPng(item.file);
			
			// Update dimensions if we didn't have them
			if (!item.width || !item.height) {
				images.updateItem(item.id, { width, height });
			}
			
			images.updateItem(item.id, { progress: 30 });

			// Now process the PNG through the worker
			const imageBuffer = await pngBlob.arrayBuffer();

			const { result, mimeType, newWidth, newHeight } = await processImageInWorker(
				item.id,
				imageBuffer,
				'png', // Treat as PNG for the worker
				outputFormat,
				quality,
				lossless,
				maxDimension,
				(progress) => {
					// Scale progress from 30-90 range
					const scaledProgress = 30 + (progress * 0.6);
					images.updateItem(item.id, { progress: scaledProgress });
				}
			);

			compressedBlob = new Blob([result], { type: mimeType });
			finalWidth = newWidth;
			finalHeight = newHeight;
		} else {
			// Standard raster image processing via worker
			const imageBuffer = await item.file.arrayBuffer();

			const { result, mimeType, newWidth, newHeight } = await processImageInWorker(
				item.id,
				imageBuffer,
				item.format,
				outputFormat,
				quality,
				lossless,
				maxDimension,
				(progress) => {
					images.updateItem(item.id, { progress });
				}
			);

			compressedBlob = new Blob([result], { type: mimeType });
			finalWidth = newWidth;
			finalHeight = newHeight;
		}

		// Create URL for preview
		const compressedUrl = URL.createObjectURL(compressedBlob);

		// Update item with final dimensions if they changed (due to resize)
		const updates: Partial<ImageItem> = {
			status: 'completed',
			progress: 100,
			compressedSize: compressedBlob.size,
			compressedUrl,
			compressedBlob
		};

		// Update dimensions if resized
		if (finalWidth && finalHeight && (finalWidth !== item.width || finalHeight !== item.height)) {
			updates.width = finalWidth;
			updates.height = finalHeight;
		}

		images.updateItem(item.id, updates);
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

// Render SVG to canvas and return as PNG blob for worker processing
async function renderSvgToRaster(file: File): Promise<{ blob: Blob; width: number; height: number }> {
	const text = await file.text();
	const svgBlob = new Blob([text], { type: 'image/svg+xml' });
	const url = URL.createObjectURL(svgBlob);

	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			
			// Use natural dimensions, with a reasonable max for very large SVGs
			const maxDim = 4096;
			let width = img.naturalWidth || 800;
			let height = img.naturalHeight || 600;
			
			// Scale down if too large
			if (width > maxDim || height > maxDim) {
				const scale = maxDim / Math.max(width, height);
				width = Math.round(width * scale);
				height = Math.round(height * scale);
			}
			
			// Render to canvas
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(img, 0, 0, width, height);
			
			// Convert to PNG blob for worker
			canvas.toBlob((blob) => {
				if (blob) {
					resolve({ blob, width, height });
				} else {
					reject(new Error('Failed to render SVG to canvas'));
				}
			}, 'image/png');
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load SVG for rasterization'));
		};
		img.src = url;
	});
}

// Compute WebP size for comparison (used for SVG complexity warning)
async function computeWebpSize(file: File, quality: number): Promise<number> {
	try {
		const { blob, width, height } = await renderSvgToRaster(file);
		const buffer = await blob.arrayBuffer();
		
		const { result } = await processImageInWorker(
			`webp-compare-${Date.now()}`,
			buffer,
			'png',
			'webp',
			quality,
			false, // not lossless for comparison
			null,  // no resize
			undefined // no progress callback
		);
		
		return result.byteLength;
	} catch (error) {
		console.warn('Failed to compute WebP comparison:', error);
		return 0;
	}
}

export function getOutputExtension(format: OutputFormat): string {
	const map: Record<OutputFormat, string> = {
		jpeg: '.jpg',
		png: '.png',
		webp: '.webp',
		avif: '.avif',
		svg: '.svg'
	};
	return map[format];
}

export function getOutputFilename(originalName: string, format: OutputFormat): string {
	const baseName = originalName.replace(/\.[^/.]+$/, '');
	return `${baseName}-optimized${getOutputExtension(format)}`;
}

// Re-process a single image with a new output format
export async function reprocessImage(id: string, newFormat: OutputFormat) {
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
		compressedBlob: undefined,
		webpAlternativeSize: undefined // Reset WebP comparison
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

	// Start batch timing
	images.startBatch(completedItems.length);

	// Reset all completed items to pending
	for (const item of completedItems) {
		if (item.compressedUrl) {
			URL.revokeObjectURL(item.compressedUrl);
		}
		
		// Determine output format based on settings
		let outputFormat: OutputFormat;
		if (item.format === 'heic') {
			// HEIC can't use 'same'
			outputFormat = images.settings.outputFormat === 'same' ? 'webp' : images.settings.outputFormat;
		} else if (item.format === 'svg') {
			// SVG: use 'svg' if 'same', otherwise convert
			outputFormat = images.settings.outputFormat === 'same' ? 'svg' : images.settings.outputFormat;
		} else {
			outputFormat = images.settings.outputFormat === 'same' 
				? item.format as OutputFormat 
				: images.settings.outputFormat;
		}
		
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
	
	// End batch timing
	images.endBatch();
}
