export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'svg';
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
	outputFormat: ImageFormat;
	status: ImageStatus;
	progress: number;
	error?: string;
}

export interface CompressionSettings {
	quality: number;
	outputFormat: 'same' | ImageFormat;
}

function createImagesStore() {
	let items = $state<ImageItem[]>([]);
	let settings = $state<CompressionSettings>({
		quality: 80,
		outputFormat: 'same'
	});

	function getFormatFromMime(mimeType: string): ImageFormat {
		const map: Record<string, ImageFormat> = {
			'image/jpeg': 'jpeg',
			'image/jpg': 'jpeg',
			'image/png': 'png',
			'image/webp': 'webp',
			'image/avif': 'avif',
			'image/gif': 'gif',
			'image/svg+xml': 'svg'
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

		addFiles(files: FileList | File[]) {
			const validTypes = [
				'image/jpeg',
				'image/jpg',
				'image/png',
				'image/webp',
				'image/avif',
				'image/gif',
				'image/svg+xml'
			];

			const newItems: ImageItem[] = [];

			for (const file of files) {
				if (!validTypes.includes(file.type)) continue;

				const format = getFormatFromMime(file.type);
				const outputFormat = settings.outputFormat === 'same' ? format : settings.outputFormat;

				newItems.push({
					id: generateId(),
					file,
					name: file.name,
					originalSize: file.size,
					originalUrl: URL.createObjectURL(file),
					format,
					outputFormat,
					status: 'pending',
					progress: 0
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
		},

		updateSettings(newSettings: Partial<CompressionSettings>) {
			settings = { ...settings, ...newSettings };

			// Update output format for pending items
			if (newSettings.outputFormat !== undefined) {
				items = items.map((item) => {
					if (item.status === 'pending') {
						return {
							...item,
							outputFormat: newSettings.outputFormat === 'same' ? item.format : newSettings.outputFormat!
						};
					}
					return item;
				});
			}
		},

		getItemById(id: string) {
			return items.find((i) => i.id === id);
		}
	};
}

export const images = createImagesStore();
