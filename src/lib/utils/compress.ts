import { images, type OutputFormat, type ImageItem, type ScaledOutput } from '$lib/stores/images.svelte';
import { optimize } from 'svgo';
import { processImage as processImageInWorker, initPool } from './worker-pool';
import heic2any from 'heic2any';

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
		const export2x = images.settings.export2x;
		const export3x = images.settings.export3x;
		const outputFormat = item.outputFormat;

		let compressedBlob: Blob;
		let finalWidth: number | undefined;
		let finalHeight: number | undefined;
		let scaledOutputs: ScaledOutput[] | undefined;

		if (item.format === 'svg' && outputFormat === 'svg') {
			// SVG → SVG: Optimize with SVGO
			compressedBlob = await optimizeSvg(item.file);
			images.updateItem(item.id, { progress: 70 });
			
			// Compute WebP at 3× dimensions for complexity comparison
			// If optimized SVG is larger than a 3× retina WebP, it's too complex
			const webp3xSize = await computeWebp3xSize(item.file, quality);
			if (webp3xSize > 0 && compressedBlob.size > webp3xSize) {
				images.updateItem(item.id, { webpAlternativeSize: webp3xSize });
			}
			images.updateItem(item.id, { progress: 90 });
		} else if (item.format === 'svg' && outputFormat !== 'svg') {
			// SVG → Raster: Generate multi-scale outputs (1x, optionally 2x, 3x)
			images.updateItem(item.id, { progress: 5 });
			
			// Determine which scales to generate
			const scales: number[] = [1];
			if (export2x) scales.push(2);
			if (export3x) scales.push(3);
			
			scaledOutputs = [];
			let totalSize = 0;
			const progressPerScale = 90 / scales.length;
			
			for (let i = 0; i < scales.length; i++) {
				const scale = scales[i];
				const baseProgress = 5 + (i * progressPerScale);
				
				// Render SVG at this scale
				const { blob: pngBlob, width, height } = await renderSvgAtScale(item.file, scale);
				images.updateItem(item.id, { progress: baseProgress + progressPerScale * 0.3 });
				
				// Process through worker
				const imageBuffer = await pngBlob.arrayBuffer();
				const { result, mimeType, width: outWidth, height: outHeight } = await processImageInWorker(
					`${item.id}-${scale}x`,
					imageBuffer,
					'png',
					outputFormat,
					quality,
					lossless,
					(progress) => {
						const scaledProgress = baseProgress + progressPerScale * 0.3 + (progress / 100) * progressPerScale * 0.7;
						images.updateItem(item.id, { progress: scaledProgress });
					}
				);
				
				const blob = new Blob([result], { type: mimeType });
				const url = URL.createObjectURL(blob);
				
				scaledOutputs.push({
					scale,
					blob,
					size: blob.size,
					url,
					width: outWidth,
					height: outHeight
				});
				
				totalSize += blob.size;
				
				// Set 1x as the primary output
				if (scale === 1) {
					compressedBlob = blob;
					finalWidth = outWidth;
					finalHeight = outHeight;
				}
			}
			
			// Update dimensions from 1x output
			if (!item.width || !item.height) {
				const oneX = scaledOutputs.find(o => o.scale === 1);
				if (oneX) {
					images.updateItem(item.id, { width: oneX.width, height: oneX.height });
				}
			}
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

			const { result, mimeType, width: outWidth, height: outHeight } = await processImageInWorker(
				item.id,
				imageBuffer,
				'png',
				outputFormat,
				quality,
				lossless,
				(progress) => {
					const scaledProgress = 30 + (progress * 0.6);
					images.updateItem(item.id, { progress: scaledProgress });
				}
			);

			compressedBlob = new Blob([result], { type: mimeType });
			finalWidth = outWidth;
			finalHeight = outHeight;
		} else {
			// Standard raster image processing via worker
			const imageBuffer = await item.file.arrayBuffer();

			const { result, mimeType, width: outWidth, height: outHeight } = await processImageInWorker(
				item.id,
				imageBuffer,
				item.format,
				outputFormat,
				quality,
				lossless,
				(progress) => {
					images.updateItem(item.id, { progress });
				}
			);

			compressedBlob = new Blob([result], { type: mimeType });
			finalWidth = outWidth;
			finalHeight = outHeight;
		}

		// Create URL for preview (1x output for SVG multi-scale)
		const compressedUrl = URL.createObjectURL(compressedBlob!);

		// Calculate total size (sum of all scaled outputs or just single output)
		const totalCompressedSize = scaledOutputs 
			? scaledOutputs.reduce((sum, o) => sum + o.size, 0)
			: compressedBlob!.size;

		// Update item
		const updates: Partial<ImageItem> = {
			status: 'completed',
			progress: 100,
			compressedSize: totalCompressedSize,
			compressedUrl,
			compressedBlob: compressedBlob!,
			scaledOutputs
		};

		// Update dimensions from final output
		if (finalWidth && finalHeight) {
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

// Render SVG to canvas at 1× scale and return as PNG blob for worker processing
async function renderSvgToRaster(file: File): Promise<{ blob: Blob; width: number; height: number }> {
	return renderSvgAtScale(file, 1);
}

// Render SVG at a specific scale factor and return as PNG blob
async function renderSvgAtScale(file: File, scale: number): Promise<{ blob: Blob; width: number; height: number }> {
	const text = await file.text();
	const svgBlob = new Blob([text], { type: 'image/svg+xml' });
	const url = URL.createObjectURL(svgBlob);

	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			
			// Get natural dimensions and apply scale
			const baseWidth = img.naturalWidth || 800;
			const baseHeight = img.naturalHeight || 600;
			let width = Math.round(baseWidth * scale);
			let height = Math.round(baseHeight * scale);
			
			// Cap at reasonable max to avoid memory issues
			const maxDim = 8192;
			if (width > maxDim || height > maxDim) {
				const capScale = maxDim / Math.max(width, height);
				width = Math.round(width * capScale);
				height = Math.round(height * capScale);
			}
			
			// Render to canvas at scaled dimensions
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(img, 0, 0, width, height);
			
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

// Compute WebP size at 3× dimensions for SVG complexity comparison
// If the optimized SVG is larger than a 3× retina WebP, it's too complex
async function computeWebp3xSize(file: File, quality: number): Promise<number> {
	try {
		// Render SVG at 3× dimensions (retina/high-DPI quality)
		const { blob } = await renderSvgAtScale(file, 3);
		const buffer = await blob.arrayBuffer();
		
		const { result } = await processImageInWorker(
			`webp-compare-${Date.now()}`,
			buffer,
			'png',
			'webp',
			quality,
			false // lossy for fair comparison
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

export function getOutputFilename(originalName: string, format: OutputFormat, scale?: number): string {
	const baseName = originalName.replace(/\.[^/.]+$/, '');
	const scaleSuffix = scale && scale > 1 ? `@${scale}x` : '';
	return `${baseName}-optimized${scaleSuffix}${getOutputExtension(format)}`;
}

// Re-process a single image with a new output format
export async function reprocessImage(id: string, newFormat: OutputFormat) {
	const item = images.getItemById(id);
	if (!item) return;

	// Clean up old URLs
	if (item.compressedUrl) {
		URL.revokeObjectURL(item.compressedUrl);
	}
	item.scaledOutputs?.forEach(o => URL.revokeObjectURL(o.url));

	// Update the item with new format and reset status
	images.updateItem(id, {
		outputFormat: newFormat,
		status: 'pending',
		progress: 0,
		compressedSize: undefined,
		compressedUrl: undefined,
		compressedBlob: undefined,
		webpAlternativeSize: undefined,
		scaledOutputs: undefined
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
		item.scaledOutputs?.forEach(o => URL.revokeObjectURL(o.url));
		
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
			compressedBlob: undefined,
			scaledOutputs: undefined
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
