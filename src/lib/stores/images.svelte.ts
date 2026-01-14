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
	stripMetadata: boolean;
}

const SETTINGS_KEY = 'squishan-settings';

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
		quality: 80,
		outputFormat: 'same',
		stripMetadata: true
	};
}

function createImagesStore() {
	let items = $state<ImageItem[]>([]);
	let settings = $state<CompressionSettings>(loadSettings());

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
			saveSettings(settings);

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
