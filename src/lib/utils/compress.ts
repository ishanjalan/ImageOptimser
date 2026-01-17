import { images, type OutputFormat, type ImageItem, type ResizeMode } from '$lib/stores/images.svelte';
import { optimize } from 'svgo';
import { processImage as processImageInWorker, initPool } from './worker-pool';
import heic2any from 'heic2any';

// Processing state
let isProcessing = false;
const queue: string[] = [];

// Abort controller for cancelling processing
let abortController: AbortController | null = null;

export function cancelProcessing(): void {
	if (abortController) {
		abortController.abort();
		abortController = null;
	}
	
	// Clear the queue
	queue.length = 0;
	
	// Reset all processing items to pending
	images.items
		.filter(i => i.status === 'processing')
		.forEach(i => images.updateItem(i.id, { 
			status: 'pending', 
			progress: 0,
			targetSizeAttempt: undefined,
			targetSizeMaxAttempts: undefined
		}));
	
	isProcessing = false;
}

export function isCurrentlyProcessing(): boolean {
	return isProcessing;
}

export async function processImages(ids: string[]) {
	// Start batch timing if this is a new batch
	if (!isProcessing && ids.length > 0) {
		images.startBatch(ids.length);
		// Create new abort controller for this batch
		abortController = new AbortController();
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

// Calculate resized dimensions based on settings
function calculateResizedDimensions(
	originalWidth: number,
	originalHeight: number,
	mode: ResizeMode,
	percentage: number,
	maxWidth: number,
	maxHeight: number
): { width: number; height: number } {
	if (mode === 'percentage') {
		const scale = percentage / 100;
		return {
			width: Math.round(originalWidth * scale),
			height: Math.round(originalHeight * scale)
		};
	} else {
		// 'fit' or 'dimensions' mode - fit within max bounds maintaining aspect ratio
		const aspectRatio = originalWidth / originalHeight;
		
		let newWidth = originalWidth;
		let newHeight = originalHeight;
		
		// Only downscale, never upscale
		if (originalWidth > maxWidth || originalHeight > maxHeight) {
			if (originalWidth / maxWidth > originalHeight / maxHeight) {
				// Width is the limiting factor
				newWidth = maxWidth;
				newHeight = Math.round(maxWidth / aspectRatio);
			} else {
				// Height is the limiting factor
				newHeight = maxHeight;
				newWidth = Math.round(maxHeight * aspectRatio);
			}
		}
		
		return { width: newWidth, height: newHeight };
	}
}

// Resize an image blob using OffscreenCanvas (or regular Canvas as fallback)
async function resizeImageBlob(
	blob: Blob,
	targetWidth: number,
	targetHeight: number
): Promise<{ blob: Blob; width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(blob);
		
		img.onload = () => {
			URL.revokeObjectURL(url);
			
			try {
				const canvas = document.createElement('canvas');
				canvas.width = targetWidth;
				canvas.height = targetHeight;
				
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('Failed to get canvas context'));
					return;
				}
				
				// Use high-quality image interpolation
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = 'high';
				
				ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
				
				canvas.toBlob((resizedBlob) => {
					if (resizedBlob) {
						resolve({ blob: resizedBlob, width: targetWidth, height: targetHeight });
					} else {
						reject(new Error('Failed to create resized blob'));
					}
				}, 'image/png'); // Use PNG as intermediate format for quality
			} catch (err) {
				reject(err);
			}
		};
		
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image for resize'));
		};
		
		img.src = url;
	});
}

// Compress a single image at a specific quality level (used for binary search)
async function compressAtQuality(
	item: ImageItem,
	quality: number,
	lossless: boolean,
	onProgress?: (progress: number) => void
): Promise<{ blob: Blob; width: number; height: number }> {
	const outputFormat = item.outputFormat;
	
	if (item.format === 'heic') {
		// HEIC: Convert to PNG first, then process
		const { blob: pngBlob, width, height } = await convertHeicToPng(item.file);
		const imageBuffer = await pngBlob.arrayBuffer();

		const { result, mimeType, width: outWidth, height: outHeight } = await processImageInWorker(
			`${item.id}-q${quality}`,
			imageBuffer,
			'png',
			outputFormat,
			quality,
			lossless,
			onProgress
		);

		return { blob: new Blob([result], { type: mimeType }), width: outWidth, height: outHeight };
	} else {
		// Standard raster image processing
		const imageBuffer = await item.file.arrayBuffer();

		const { result, mimeType, width: outWidth, height: outHeight } = await processImageInWorker(
			`${item.id}-q${quality}`,
			imageBuffer,
			item.format,
			outputFormat,
			quality,
			lossless,
			onProgress
		);

		return { blob: new Blob([result], { type: mimeType }), width: outWidth, height: outHeight };
	}
}

// Binary search to find optimal quality for target file size
async function compressToTargetSize(
	item: ImageItem,
	targetSizeBytes: number,
	maxIterations: number = 6
): Promise<{ blob: Blob; width: number; height: number; achievedQuality: number; warning?: string }> {
	let minQuality = 10;
	let maxQuality = 98;
	let bestBlob: Blob | null = null;
	let bestWidth = 0;
	let bestHeight = 0;
	let bestQuality = minQuality;

	images.updateItem(item.id, { 
		targetSizeAttempt: 0, 
		targetSizeMaxAttempts: maxIterations 
	});

	for (let i = 0; i < maxIterations; i++) {
		const quality = Math.round((minQuality + maxQuality) / 2);
		
		images.updateItem(item.id, { 
			targetSizeAttempt: i + 1,
			progress: ((i + 1) / maxIterations) * 80 // Leave room for final compression
		});

		const { blob, width, height } = await compressAtQuality(item, quality, false);

		if (blob.size <= targetSizeBytes) {
			bestBlob = blob;
			bestWidth = width;
			bestHeight = height;
			bestQuality = quality;
			minQuality = quality + 1; // Try higher quality
		} else {
			maxQuality = quality - 1; // Need lower quality
		}

		// Early exit if we've found a good match
		if (maxQuality < minQuality) break;
	}

	// If we found no blob under target, use the lowest quality result
	if (!bestBlob) {
		images.updateItem(item.id, { progress: 90 });
		const { blob, width, height } = await compressAtQuality(item, 10, false);
		
		const warning = blob.size > targetSizeBytes 
			? `Target ${Math.round(targetSizeBytes / 1024)}KB not achievable. Best: ${Math.round(blob.size / 1024)}KB at quality 10`
			: undefined;
		
		return { blob, width, height, achievedQuality: 10, warning };
	}

	return { blob: bestBlob, width: bestWidth, height: bestHeight, achievedQuality: bestQuality };
}

async function compressImage(item: ImageItem) {
	try {
		// Check if aborted before starting
		if (abortController?.signal.aborted) {
			return;
		}
		
		images.updateItem(item.id, { status: 'processing', progress: 5 });

		const quality = images.settings.quality;
		const lossless = images.settings.lossless;
		const outputFormat = item.outputFormat;
		const targetSizeMode = images.settings.targetSizeMode;
		const targetSizeKB = images.settings.targetSizeKB;
		
		// Resize settings
		const resizeEnabled = images.settings.resizeEnabled;
		const resizeMode = images.settings.resizeMode;
		const resizePercentage = images.settings.resizePercentage;
		const resizeMaxWidth = images.settings.resizeMaxWidth;
		const resizeMaxHeight = images.settings.resizeMaxHeight;

		let compressedBlob: Blob;
		let finalWidth: number | undefined;
		let finalHeight: number | undefined;
		let resizedWidth: number | undefined;
		let resizedHeight: number | undefined;

		// Target size mode for raster images (not SVG)
		if (targetSizeMode && item.format !== 'svg' && !lossless) {
			const targetBytes = targetSizeKB * 1024;
			const { blob, width, height, achievedQuality, warning } = await compressToTargetSize(item, targetBytes);
			
			compressedBlob = blob;
			finalWidth = width;
			finalHeight = height;
			
			images.updateItem(item.id, { 
				achievedQuality,
				targetSizeWarning: warning,
				progress: 95
			});
		} else if (item.format === 'svg' && outputFormat === 'svg') {
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
			// SVG → Raster: Render at 1x and compress
			images.updateItem(item.id, { progress: 5 });
			
			// Render SVG to raster at 1x scale
			const { blob: pngBlob, width, height } = await renderSvgToRaster(item.file);
			images.updateItem(item.id, { progress: 30 });
			
			// Update dimensions if we didn't have them
			if (!item.width || !item.height) {
				images.updateItem(item.id, { width, height });
			}
			
			// Process through worker
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
			let sourceBlob: Blob = item.file;
			let sourceFormat = item.format;
			
			// Apply resize if enabled and we have dimensions
			if (resizeEnabled && item.width && item.height) {
				images.updateItem(item.id, { progress: 10 });
				
				const { width: targetWidth, height: targetHeight } = calculateResizedDimensions(
					item.width,
					item.height,
					resizeMode,
					resizePercentage,
					resizeMaxWidth,
					resizeMaxHeight
				);
				
				// Only resize if dimensions actually changed
				if (targetWidth !== item.width || targetHeight !== item.height) {
					const { blob: resizedBlobResult, width: rw, height: rh } = await resizeImageBlob(
						item.file,
						targetWidth,
						targetHeight
					);
					sourceBlob = resizedBlobResult;
					sourceFormat = 'png'; // Resize produces PNG
					resizedWidth = rw;
					resizedHeight = rh;
					
					images.updateItem(item.id, { progress: 30 });
				}
			}
			
			const imageBuffer = await sourceBlob.arrayBuffer();
			const startProgress = resizeEnabled ? 30 : 0;

			const { result, mimeType, width: outWidth, height: outHeight } = await processImageInWorker(
				item.id,
				imageBuffer,
				sourceFormat,
				outputFormat,
				quality,
				lossless,
				(progress) => {
					const scaledProgress = startProgress + (progress * (100 - startProgress) / 100);
					images.updateItem(item.id, { progress: scaledProgress });
				}
			);

			compressedBlob = new Blob([result], { type: mimeType });
			finalWidth = outWidth;
			finalHeight = outHeight;
		}

		// Create URL for preview
		const compressedUrl = URL.createObjectURL(compressedBlob!);

		// Update item
		const updates: Partial<ImageItem> = {
			status: 'completed',
			progress: 100,
			compressedSize: compressedBlob!.size,
			compressedUrl,
			compressedBlob: compressedBlob!
		};

		// Update dimensions from final output
		if (finalWidth && finalHeight) {
			updates.width = finalWidth;
			updates.height = finalHeight;
		}
		
		// Add resize info if resized
		if (resizedWidth && resizedHeight) {
			updates.resizedWidth = resizedWidth;
			updates.resizedHeight = resizedHeight;
		}

		images.updateItem(item.id, updates);
	} catch (error) {
		console.error('Compression error:', error);
		
		// Generate specific, actionable error messages
		let message = 'Compression failed';
		
		if (error instanceof Error) {
			const errorMsg = error.message.toLowerCase();
			
			if (errorMsg.includes('decode') || errorMsg.includes('invalid') || errorMsg.includes('corrupt')) {
				message = 'Image appears corrupted. Try re-saving the original file.';
			} else if (errorMsg.includes('memory') || errorMsg.includes('oom') || errorMsg.includes('allocation')) {
				message = 'Image too large for browser memory. Try a smaller image.';
			} else if (errorMsg.includes('format') || errorMsg.includes('unsupported')) {
				message = 'Unsupported image format or encoding.';
			} else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
				message = 'Network error loading image. Check your connection.';
			} else if (errorMsg.includes('abort')) {
				message = 'Processing was cancelled.';
			} else if (errorMsg.includes('worker')) {
				message = 'Worker error. Try refreshing the page.';
			} else if (errorMsg.includes('heic') || errorMsg.includes('heif')) {
				message = 'HEIC conversion failed. The file may be incompatible.';
			} else {
				// Use original message but make it more user-friendly
				message = error.message.length > 100 
					? error.message.substring(0, 100) + '...'
					: error.message;
			}
		}
		
		images.updateItem(item.id, {
			status: 'error',
			error: message
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
		jxl: '.jxl',
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

	// Update the item with new format and reset status
	images.updateItem(id, {
		outputFormat: newFormat,
		status: 'pending',
		progress: 0,
		compressedSize: undefined,
		compressedUrl: undefined,
		compressedBlob: undefined,
		webpAlternativeSize: undefined
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
