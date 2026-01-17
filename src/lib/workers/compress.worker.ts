// Compression Web Worker
// Handles WASM-based image encoding/decoding off the main thread using icodec

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'jxl' | 'svg';

export interface WorkerRequest {
	id: string;
	type: 'compress';
	imageBuffer: ArrayBuffer;
	inputFormat: ImageFormat;
	outputFormat: ImageFormat;
	quality: number;
	lossless: boolean;
}

export interface WorkerResponse {
	id: string;
	success: boolean;
	result?: ArrayBuffer;
	mimeType?: string;
	error?: string;
	progress?: number;
	width?: number;
	height?: number;
}

// icodec types
import type { jpeg, png, webp, avif, jxl, ImageDataLike } from 'icodec';

type JpegCodec = typeof jpeg;
type PngCodec = typeof png;
type WebpCodec = typeof webp;
type AvifCodec = typeof avif;
type JxlCodec = typeof jxl;

// Codec modules (loaded lazily)
let jpegCodec: JpegCodec | null = null;
let pngCodec: PngCodec | null = null;
let webpCodec: WebpCodec | null = null;
let avifCodec: AvifCodec | null = null;
let jxlCodec: JxlCodec | null = null;

let codecsInitialized = false;

// Convert standard ImageData to icodec's ImageDataLike
function toImageDataLike(imageData: ImageData): ImageDataLike {
	return {
		width: imageData.width,
		height: imageData.height,
		depth: 8, // Standard web ImageData is always 8-bit per channel
		data: imageData.data
	};
}

// Convert icodec's ImageDataLike back to standard ImageData
function toImageData(imageDataLike: ImageDataLike): ImageData {
	// Copy data to a fresh ArrayBuffer to avoid SharedArrayBuffer issues
	const sourceData = imageDataLike.data;
	const newBuffer = new ArrayBuffer(sourceData.byteLength);
	const data = new Uint8ClampedArray(newBuffer);
	data.set(sourceData);
	return new ImageData(data, imageDataLike.width, imageDataLike.height);
}

// Initialize all WASM codecs using icodec
async function initCodecs() {
	if (codecsInitialized) return;

	// Import icodec - uses named star exports
	const icodec = await import('icodec');

	// Store module references
	jpegCodec = icodec.jpeg;
	pngCodec = icodec.png;
	webpCodec = icodec.webp;
	avifCodec = icodec.avif;
	jxlCodec = icodec.jxl;

	// Load encoders and decoders (icodec requires explicit WASM loading)
	await Promise.all([
		jpegCodec.loadEncoder(),
		jpegCodec.loadDecoder(),
		pngCodec.loadEncoder(),
		pngCodec.loadDecoder(),
		webpCodec.loadEncoder(),
		webpCodec.loadDecoder(),
		avifCodec.loadEncoder(),
		avifCodec.loadDecoder(),
		jxlCodec.loadEncoder(),
		jxlCodec.loadDecoder()
	]);

	codecsInitialized = true;
}

// Decode image buffer to ImageData
function decodeImage(buffer: ArrayBuffer, format: ImageFormat): ImageData {
	const uint8 = new Uint8Array(buffer);
	
	switch (format) {
		case 'jpeg':
			return jpegCodec!.decode(uint8);
		case 'png':
			return toImageData(pngCodec!.decode(uint8));
		case 'webp':
			return webpCodec!.decode(uint8);
		case 'avif':
			return avifCodec!.decode(uint8);
		case 'jxl':
			return jxlCodec!.decode(uint8);
		default:
			throw new Error(`Cannot decode format in worker: ${format}`);
	}
}

// Encode ImageData to target format
function encodeImage(imageData: ImageData, format: ImageFormat, quality: number, lossless: boolean): Uint8Array {
	// Convert to icodec's ImageDataLike format
	const imageDataLike = toImageDataLike(imageData);
	
	switch (format) {
		case 'jpeg':
			// JPEG doesn't support lossless - use max quality (100) when lossless is requested
			return jpegCodec!.encode(imageDataLike, { quality: lossless ? 100 : quality });
		
		case 'png':
			// PNG encoding options: level controls compression, quantize controls lossiness
			// For lossless: disable quantization (pngquant-style lossy compression)
			// For lossy: enable quantization for smaller files
			return pngCodec!.encode(imageDataLike, { 
				level: lossless ? 4 : 3,
				quantize: !lossless // Disable lossy quantization in lossless mode
			});
		
		case 'webp':
			// WebP has native lossless mode
			if (lossless) {
				return webpCodec!.encode(imageDataLike, { lossless: true });
			}
			return webpCodec!.encode(imageDataLike, { quality });
		
		case 'avif':
			// AVIF encoding: quality 0-100, speed 0-10 (lower = slower/better)
			if (lossless) {
				return avifCodec!.encode(imageDataLike, { quality: 100, speed: 4 });
			}
			return avifCodec!.encode(imageDataLike, { quality, speed: 6 });
		
		case 'jxl':
			// JPEG XL has native lossless mode
			// For lossy: quality 0-100 (matches libjpeg scale)
			if (lossless) {
				return jxlCodec!.encode(imageDataLike, { lossless: true });
			}
			return jxlCodec!.encode(imageDataLike, { quality });
		
		default:
			throw new Error(`Unsupported output format: ${format}`);
	}
}

// Get MIME type for format
function getMimeType(format: ImageFormat): string {
	const map: Record<ImageFormat, string> = {
		jpeg: 'image/jpeg',
		png: 'image/png',
		webp: 'image/webp',
		avif: 'image/avif',
		jxl: 'image/jxl',
		svg: 'image/svg+xml'
	};
	return map[format];
}

// Send progress update to main thread
function sendProgress(id: string, progress: number) {
	const response: WorkerResponse = { id, success: true, progress };
	self.postMessage(response);
}

// Process compression request
async function processCompression(request: WorkerRequest): Promise<void> {
	const { id, imageBuffer, inputFormat, outputFormat, quality, lossless } = request;

	try {
		// Initialize codecs if needed
		await initCodecs();
		sendProgress(id, 20);

		// Decode the image
		const imageData = decodeImage(imageBuffer, inputFormat);
		sendProgress(id, 50);

		// Encode to target format
		const result = encodeImage(imageData, outputFormat, quality, lossless);
		sendProgress(id, 90);

		// Convert Uint8Array to ArrayBuffer for transfer
		const resultBuffer = result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength) as ArrayBuffer;

		// Send result back (transfer ownership for performance)
		const response: WorkerResponse = {
			id,
			success: true,
			result: resultBuffer,
			mimeType: getMimeType(outputFormat),
			width: imageData.width,
			height: imageData.height
		};
		(self as unknown as Worker).postMessage(response, [resultBuffer]);
	} catch (error) {
		const response: WorkerResponse = {
			id,
			success: false,
			error: error instanceof Error ? error.message : 'Compression failed'
		};
		self.postMessage(response);
	}
}

// Message handler
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const request = event.data;

	if (request.type === 'compress') {
		await processCompression(request);
	}
};

// Signal that worker is ready
self.postMessage({ type: 'ready' });
