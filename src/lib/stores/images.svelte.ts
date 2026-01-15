export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'svg' | 'heic';
export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'svg'; // HEIC is input-only
export type ImageStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface ImageItem {
	id: string;
	file: File;
	name: string;
	originalSize: number;
	compressedSize?: number;
	originalUrl: string;
	compressedUrl?: string;
	compressedBlob?: Blob;
	format: ImageFormat;
	outputFormat: OutputFormat;
	status: ImageStatus;
	progress: number;
	error?: string;
	width?: number;
	height?: number;
	// For SVG: tracks WebP alternative size for "complex SVG" warning
	webpAlternativeSize?: number;
}

export interface CompressionSettings {
	quality: number;
	outputFormat: 'same' | OutputFormat;
	stripMetadata: boolean;
	lossless: boolean;
	maxDimension: number | null; // Max width/height in pixels, null = no resize
}

export interface BatchStats {
	startTime: number | null;
	endTime: number | null;
	totalImages: number;
}

const SETTINGS_KEY = 'squish-settings';

function loadSettings(): CompressionSettings {
	if (typeof localStorage === 'undefined') {
		return getDefaultSettings();
	}
	try {
		const saved = localStorage.getItem(SETTINGS_KEY);
		if (saved) {
			return { ...getDefaultSettings(), ...JSON.parse(saved) };
		}
	} catch (e) {
		console.warn('Failed to load settings from localStorage:', e);
	}
	return getDefaultSettings();
}

function saveSettings(settings: CompressionSettings) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch (e) {
		console.warn('Failed to save settings to localStorage:', e);
	}
}

function getDefaultSettings(): CompressionSettings {
	return {
		quality: 75, // "Web" preset - optimal for web, Android, iOS
		outputFormat: 'webp', // Best compression + universal support (web, Android, iOS 14+)
		stripMetadata: true,
		lossless: false,
		maxDimension: null // No resize by default
	};
}

// Extract dimensions from an image file (doesn't work for HEIC in most browsers)
async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
	// HEIC can't be loaded directly in most browsers
	if (file.type === 'image/heic' || file.type === 'image/heif') {
		return null; // Dimensions will be set after conversion
	}
	
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image dimensions'));
		};
		img.src = url;
	});
}

function createImagesStore() {
	let items = $state<ImageItem[]>([]);
	let settings = $state<CompressionSettings>(loadSettings());
	let batchStats = $state<BatchStats>({ startTime: null, endTime: null, totalImages: 0 });

	function getFormatFromMime(mimeType: string): ImageFormat {
		const map: Record<string, ImageFormat> = {
			'image/jpeg': 'jpeg',
			'image/jpg': 'jpeg',
			'image/png': 'png',
			'image/webp': 'webp',
			'image/avif': 'avif',
			'image/svg+xml': 'svg',
			'image/heic': 'heic',
			'image/heif': 'heic'
		};
		return map[mimeType] || 'jpeg';
	}

	function generateId(): string {
		return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}

	return {
		get items() {
			return items;
		},
		get settings() {
			return settings;
		},
		get batchStats() {
			return batchStats;
		},

		startBatch(count: number) {
			batchStats = { startTime: Date.now(), endTime: null, totalImages: count };
		},

		endBatch() {
			batchStats = { ...batchStats, endTime: Date.now() };
		},

		resetBatchStats() {
			batchStats = { startTime: null, endTime: null, totalImages: 0 };
		},

		async addFiles(files: FileList | File[]) {
			const validTypes = [
				'image/jpeg',
				'image/jpg',
				'image/png',
				'image/webp',
				'image/avif',
				'image/svg+xml',
				'image/heic',
				'image/heif'
			];

			const newItems: ImageItem[] = [];

			for (const file of files) {
				if (!validTypes.includes(file.type)) continue;

				const format = getFormatFromMime(file.type);
				
				// Determine output format:
				// - SVG defaults to SVG if 'same', but can now be converted to raster
				// - HEIC must be converted (can't output HEIC), default to WebP
				// - Others follow user setting
				let outputFormat: OutputFormat;
				if (format === 'svg') {
					// SVG: use 'svg' if 'same', otherwise use the user's chosen format
					outputFormat = settings.outputFormat === 'same' ? 'svg' : settings.outputFormat;
				} else if (format === 'heic') {
					// HEIC is input-only, always convert to user's preferred format (or WebP if 'same')
					outputFormat = settings.outputFormat === 'same' ? 'webp' : settings.outputFormat;
				} else {
					outputFormat = settings.outputFormat === 'same' ? format as OutputFormat : settings.outputFormat;
				}

				// Get dimensions asynchronously (returns null for HEIC)
				let width: number | undefined;
				let height: number | undefined;
				try {
					const dims = await getImageDimensions(file);
					if (dims) {
						width = dims.width;
						height = dims.height;
					}
				} catch (e) {
					console.warn('Failed to get dimensions for', file.name);
				}

				newItems.push({
					id: generateId(),
					file,
					name: file.name,
					originalSize: file.size,
					originalUrl: URL.createObjectURL(file),
					format,
					outputFormat,
					status: 'pending',
					progress: 0,
					width,
					height
				});
			}

			items = [...items, ...newItems];
			return newItems;
		},

		updateItem(id: string, updates: Partial<ImageItem>) {
			items = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
		},

		removeItem(id: string) {
			const item = items.find((i) => i.id === id);
			if (item) {
				URL.revokeObjectURL(item.originalUrl);
				if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
			}
			items = items.filter((i) => i.id !== id);
		},

		clearAll() {
			items.forEach((item) => {
				URL.revokeObjectURL(item.originalUrl);
				if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
			});
			items = [];
			batchStats = { startTime: null, endTime: null, totalImages: 0 };
		},

		updateSettings(newSettings: Partial<CompressionSettings>) {
			settings = { ...settings, ...newSettings };
			saveSettings(settings);

			// Update output format for pending items
			if (newSettings.outputFormat !== undefined) {
				items = items.map((item) => {
					if (item.status === 'pending') {
						// HEIC can't use 'same' - default to WebP
						if (item.format === 'heic' && newSettings.outputFormat === 'same') {
							return { ...item, outputFormat: 'webp' as OutputFormat };
						}
						// SVG: use 'svg' if 'same', otherwise convert
						if (item.format === 'svg' && newSettings.outputFormat === 'same') {
							return { ...item, outputFormat: 'svg' as OutputFormat };
						}
						return {
							...item,
							outputFormat: newSettings.outputFormat === 'same' 
								? item.format as OutputFormat 
								: newSettings.outputFormat!
						};
					}
					return item;
				});
			}
		},

		getItemById(id: string) {
			return items.find((i) => i.id === id);
		},

		reorderItems(draggedId: string, targetId: string) {
			const draggedIndex = items.findIndex((i) => i.id === draggedId);
			const targetIndex = items.findIndex((i) => i.id === targetId);

			if (draggedIndex === -1 || targetIndex === -1) return;

			const newItems = [...items];
			const [draggedItem] = newItems.splice(draggedIndex, 1);
			newItems.splice(targetIndex, 0, draggedItem);
			items = newItems;
		}
	};
}

export const images = createImagesStore();
