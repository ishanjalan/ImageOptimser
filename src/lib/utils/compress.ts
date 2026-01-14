import { images, type ImageFormat, type ImageItem } from '$lib/stores/images.svelte';
import { optimize } from 'svgo';

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

		// Load the image
		const img = await loadImage(item.file);
		images.updateItem(item.id, { progress: 30 });

		// Get quality from settings
		const quality = images.settings.quality / 100;
		const outputFormat = item.outputFormat;

		// Compress based on output format
		let compressedBlob: Blob;

		if (outputFormat === 'svg') {
			// SVG files - just pass through or optimize
			compressedBlob = await optimizeSvg(item.file);
		} else {
			// Raster images - use canvas compression
			compressedBlob = await compressWithCanvas(img, outputFormat, quality);
		}

		images.updateItem(item.id, { progress: 80 });

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

function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('Failed to load image'));
		img.src = URL.createObjectURL(file);
	});
}

async function compressWithCanvas(
	img: HTMLImageElement,
	format: ImageFormat,
	quality: number
): Promise<Blob> {
	// Create canvas
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;

	// Set dimensions
	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;

	// Draw image
	ctx.drawImage(img, 0, 0);

	// Get mime type
	const mimeType = getMimeType(format);

	// Convert to blob with quality
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error('Failed to compress image'));
				}
			},
			mimeType,
			quality
		);
	});
}

async function optimizeSvg(file: File): Promise<Blob> {
	const text = await file.text();

	// Use SVGO for proper SVG optimization
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
