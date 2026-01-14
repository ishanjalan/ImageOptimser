import { images, type ImageFormat, type ImageItem } from '$lib/stores/images.svelte';
import { optimize } from 'svgo';

// Dynamic imports for WASM codecs (loaded on demand)
let jpegEncode: ((data: ImageData, options?: { quality?: number }) => Promise<ArrayBuffer>) | null = null;
let jpegDecode: ((data: ArrayBuffer) => Promise<ImageData>) | null = null;
let pngEncode: ((data: ImageData) => Promise<ArrayBuffer>) | null = null;
let pngDecode: ((data: ArrayBuffer) => Promise<ImageData>) | null = null;
let oxipngOptimize: ((data: ArrayBuffer, options?: { level?: number }) => Promise<ArrayBuffer>) | null = null;
let webpEncode: ((data: ImageData, options?: { quality?: number }) => Promise<ArrayBuffer>) | null = null;
let webpDecode: ((data: ArrayBuffer) => Promise<ImageData>) | null = null;
let avifEncode: ((data: ImageData, options?: { quality?: number; speed?: number }) => Promise<ArrayBuffer>) | null = null;
let avifDecode: ((data: ArrayBuffer) => Promise<ImageData>) | null = null;

// Initialize codecs lazily
async function initCodecs() {
	if (!jpegEncode) {
		const jpegModule = await import('@jsquash/jpeg');
		jpegEncode = jpegModule.encode;
		jpegDecode = jpegModule.decode;
	}
	if (!pngEncode) {
		const pngModule = await import('@jsquash/png');
		pngEncode = pngModule.encode;
		pngDecode = pngModule.decode;
	}
	if (!oxipngOptimize) {
		const oxipngModule = await import('@jsquash/oxipng');
		oxipngOptimize = oxipngModule.optimise;
	}
	if (!webpEncode) {
		const webpModule = await import('@jsquash/webp');
		webpEncode = webpModule.encode;
		webpDecode = webpModule.decode;
	}
	if (!avifEncode) {
		const avifModule = await import('@jsquash/avif');
		avifEncode = avifModule.encode;
		avifDecode = avifModule.decode;
	}
}

// Compression queue management
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

	// Initialize codecs once
	await initCodecs();

	while (queue.length > 0) {
		const id = queue.shift()!;
		const item = images.getItemById(id);
		if (item && item.status === 'pending') {
			await compressImage(item);
		}
	}

	isProcessing = false;
}

async function compressImage(item: ImageItem) {
	try {
		images.updateItem(item.id, { status: 'processing', progress: 10 });

		const quality = images.settings.quality;
		const outputFormat = item.outputFormat;
		const { resizeEnabled, maxWidth, maxHeight } = images.settings;

		let compressedBlob: Blob;

		if (item.format === 'svg' && outputFormat === 'svg') {
			// SVG to SVG - use SVGO
			compressedBlob = await optimizeSvg(item.file);
			images.updateItem(item.id, { progress: 90 });
		} else if (item.format === 'gif' && outputFormat === 'gif') {
			// GIF to GIF - pass through (no WASM codec available)
			compressedBlob = item.file;
			images.updateItem(item.id, { progress: 90 });
		} else {
			// Decode the source image
			images.updateItem(item.id, { progress: 20 });
			let imageData = await decodeImage(item.file, item.format);
			
			images.updateItem(item.id, { progress: 40 });
			
			// Resize if enabled and dimensions exceed limits
			if (resizeEnabled && (maxWidth || maxHeight)) {
				imageData = resizeImageData(imageData, maxWidth, maxHeight);
			}
			
			images.updateItem(item.id, { progress: 60 });
			
			// Encode to target format
			const encodedBuffer = await encodeImage(imageData, outputFormat, quality);
			
			images.updateItem(item.id, { progress: 90 });
			compressedBlob = new Blob([encodedBuffer], { type: getMimeType(outputFormat) });
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

function resizeImageData(imageData: ImageData, maxWidth?: number, maxHeight?: number): ImageData {
	const { width, height } = imageData;
	
	// Calculate new dimensions
	let newWidth = width;
	let newHeight = height;
	
	if (maxWidth && width > maxWidth) {
		newWidth = maxWidth;
		newHeight = Math.round((height / width) * maxWidth);
	}
	
	if (maxHeight && newHeight > maxHeight) {
		newHeight = maxHeight;
		newWidth = Math.round((width / height) * maxHeight);
	}
	
	// If no resize needed, return original
	if (newWidth === width && newHeight === height) {
		return imageData;
	}
	
	// Create canvas for resizing
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	
	// Create temporary canvas with original image
	const tempCanvas = document.createElement('canvas');
	const tempCtx = tempCanvas.getContext('2d')!;
	tempCanvas.width = width;
	tempCanvas.height = height;
	tempCtx.putImageData(imageData, 0, 0);
	
	// Draw resized
	canvas.width = newWidth;
	canvas.height = newHeight;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
	
	return ctx.getImageData(0, 0, newWidth, newHeight);
}

async function decodeImage(file: File, format: ImageFormat): Promise<ImageData> {
	const buffer = await file.arrayBuffer();

	switch (format) {
		case 'jpeg':
			return await jpegDecode!(buffer);
		case 'png':
			return await pngDecode!(buffer);
		case 'webp':
			return await webpDecode!(buffer);
		case 'avif':
			return await avifDecode!(buffer);
		case 'gif':
		case 'svg':
		default:
			// For formats without WASM decoders, use canvas
			return await decodeWithCanvas(file);
	}
}

async function decodeWithCanvas(file: File): Promise<ImageData> {
	const img = await loadImage(file);
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;
	ctx.drawImage(img, 0, 0);
	return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(img.src);
			resolve(img);
		};
		img.onerror = () => reject(new Error('Failed to load image'));
		img.src = URL.createObjectURL(file);
	});
}

async function encodeImage(imageData: ImageData, format: ImageFormat, quality: number): Promise<ArrayBuffer> {
	switch (format) {
		case 'jpeg':
			// MozJPEG - quality 1-100
			return await jpegEncode!(imageData, { quality });
		
		case 'png':
			// PNG encode then optimize with OxiPNG
			const pngBuffer = await pngEncode!(imageData);
			// OxiPNG level 2 is a good balance of speed/compression
			return await oxipngOptimize!(pngBuffer, { level: 2 });
		
		case 'webp':
			// WebP - quality 1-100
			return await webpEncode!(imageData, { quality });
		
		case 'avif':
			// AVIF - quality 1-100, speed 0-10 (lower = better but slower)
			return await avifEncode!(imageData, { 
				quality,
				speed: 6 // Balance between speed and quality
			});
		
		default:
			throw new Error(`Unsupported output format: ${format}`);
	}
}

async function optimizeSvg(file: File): Promise<Blob> {
	const text = await file.text();

	const result = optimize(text, {
		multipass: true,
		plugins: [
			'preset-default',
			'removeDimensions',
			'removeXMLNS',
			{
				name: 'removeAttrs',
				params: {
					attrs: ['data-name', 'class']
				}
			},
			{
				name: 'sortAttrs',
				params: {
					xmlnsOrder: 'alphabetical'
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
		gif: 'image/gif',
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
		gif: '.gif',
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

	// Initialize codecs if needed
	await initCodecs();

	// Get fresh item reference
	const updatedItem = images.getItemById(id);
	if (updatedItem) {
		await compressImage(updatedItem);
	}
}
