// Compression Web Worker
// Handles WASM-based image encoding/decoding off the main thread

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'svg';

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
}

// WASM codec functions (loaded lazily)
let jpegEncode: ((data: ImageData, options?: { quality?: number }) => Promise<ArrayBuffer>) | null = null;
let jpegDecode: ((data: ArrayBuffer) => Promise<ImageData>) | null = null;
let pngEncode: ((data: ImageData) => Promise<ArrayBuffer>) | null = null;
let pngDecode: ((data: ArrayBuffer) => Promise<ImageData>) | null = null;
let oxipngOptimize: ((data: ArrayBuffer, options?: { level?: number }) => Promise<ArrayBuffer>) | null = null;
let webpEncode: ((data: ImageData, options?: { quality?: number; lossless?: number }) => Promise<ArrayBuffer>) | null = null;
let webpDecode: ((data: ArrayBuffer) => Promise<ImageData>) | null = null;
let avifEncode: ((data: ImageData, options?: { quality?: number; speed?: number; lossless?: boolean }) => Promise<ArrayBuffer>) | null = null;
let avifDecode: ((data: ArrayBuffer) => Promise<ImageData>) | null = null;

let codecsInitialized = false;

// Initialize all WASM codecs
async function initCodecs() {
	if (codecsInitialized) return;

	const [jpegModule, pngModule, oxipngModule, webpModule, avifModule] = await Promise.all([
		import('@jsquash/jpeg'),
		import('@jsquash/png'),
		import('@jsquash/oxipng'),
		import('@jsquash/webp'),
		import('@jsquash/avif')
	]);

	jpegEncode = jpegModule.encode;
	jpegDecode = jpegModule.decode;
	pngEncode = pngModule.encode;
	pngDecode = pngModule.decode;
	oxipngOptimize = oxipngModule.optimise;
	webpEncode = webpModule.encode;
	webpDecode = webpModule.decode;
	avifEncode = avifModule.encode;
	avifDecode = avifModule.decode;

	codecsInitialized = true;
}

// Decode image buffer to ImageData
async function decodeImage(buffer: ArrayBuffer, format: ImageFormat): Promise<ImageData> {
	switch (format) {
		case 'jpeg':
			return await jpegDecode!(buffer);
		case 'png':
			return await pngDecode!(buffer);
		case 'webp':
			return await webpDecode!(buffer);
		case 'avif':
			return await avifDecode!(buffer);
		default:
			throw new Error(`Cannot decode format in worker: ${format}`);
	}
}

// Encode ImageData to target format
async function encodeImage(imageData: ImageData, format: ImageFormat, quality: number, lossless: boolean): Promise<ArrayBuffer> {
	switch (format) {
		case 'jpeg':
			// JPEG doesn't support lossless - use max quality (100) when lossless is requested
			return await jpegEncode!(imageData, { quality: lossless ? 100 : quality });
		case 'png':
			// PNG is always lossless - use higher optimization level for lossless mode
			const pngBuffer = await pngEncode!(imageData);
			return await oxipngOptimize!(pngBuffer, { level: lossless ? 4 : 2 });
		case 'webp':
			// WebP lossless mode: lossless=1 means lossless encoding
			if (lossless) {
				return await webpEncode!(imageData, { lossless: 1 });
			}
			return await webpEncode!(imageData, { quality });
		case 'avif':
			// AVIF lossless mode
			if (lossless) {
				return await avifEncode!(imageData, { lossless: true, speed: 4 });
			}
			return await avifEncode!(imageData, { quality, speed: 6 });
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
		const imageData = await decodeImage(imageBuffer, inputFormat);
		sendProgress(id, 50);

		// Encode to target format
		const result = await encodeImage(imageData, outputFormat, quality, lossless);
		sendProgress(id, 90);

		// Send result back (transfer ownership for performance)
		const response: WorkerResponse = {
			id,
			success: true,
			result,
			mimeType: getMimeType(outputFormat)
		};
		self.postMessage(response, [result]);
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
