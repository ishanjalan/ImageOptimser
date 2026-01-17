import JSZip from 'jszip';
import type { ImageItem } from '$lib/stores/images.svelte';
import { getOutputFilename } from './compress';

// Thresholds for triggering File System Access API
const LARGE_BATCH_COUNT = 20;
const LARGE_BATCH_SIZE_MB = 50;

export function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export function downloadImage(item: ImageItem) {
	if (!item.compressedBlob) return;
	const filename = getOutputFilename(item.name, item.outputFormat);
	downloadBlob(item.compressedBlob, filename);
}

export interface ZipProgressCallback {
	(progress: number): void;
}

export async function downloadAllAsZip(
	items: ImageItem[],
	onProgress?: ZipProgressCallback
): Promise<void> {
	const zip = new JSZip();

	// Track filenames to avoid duplicates
	const usedNames = new Map<string, number>();

	for (const item of items) {
		if (item.compressedBlob) {
			let filename = getOutputFilename(item.name, item.outputFormat);

			// Handle duplicate filenames
			const count = usedNames.get(filename) || 0;
			if (count > 0) {
				const ext = filename.lastIndexOf('.');
				filename = `${filename.slice(0, ext)}-${count}${filename.slice(ext)}`;
			}
			usedNames.set(filename, count + 1);

			zip.file(filename, item.compressedBlob);
		}
	}

	const content = await zip.generateAsync(
		{ type: 'blob' },
		onProgress ? (metadata) => {
			onProgress(metadata.percent);
		} : undefined
	);
	downloadBlob(content, `optimized-images-${Date.now()}.zip`);
}

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
	return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

// Check if batch is considered "large"
export function isLargeBatch(items: ImageItem[]): boolean {
	const totalSize = items.reduce((acc, i) => acc + (i.compressedSize || 0), 0);
	const totalSizeMB = totalSize / (1024 * 1024);
	
	return items.length > LARGE_BATCH_COUNT || totalSizeMB > LARGE_BATCH_SIZE_MB;
}

// Download files directly to a folder using File System Access API
export async function downloadWithFileSystemAPI(items: ImageItem[]): Promise<void> {
	if (!isFileSystemAccessSupported()) {
		throw new Error('File System Access API not supported');
	}

	// Request directory access from user
	// @ts-ignore - File System Access API types may not be available
	const dirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
		mode: 'readwrite',
		startIn: 'downloads'
	});

	// Track filenames to avoid duplicates
	const usedNames = new Map<string, number>();

	for (const item of items) {
		if (item.compressedBlob) {
			let filename = getOutputFilename(item.name, item.outputFormat);

			// Handle duplicate filenames
			const count = usedNames.get(filename) || 0;
			if (count > 0) {
				const ext = filename.lastIndexOf('.');
				filename = `${filename.slice(0, ext)}-${count}${filename.slice(ext)}`;
			}
			usedNames.set(filename, count + 1);

			// Create file and write content
			const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
			const writable = await fileHandle.createWritable();
			await writable.write(item.compressedBlob);
			await writable.close();
		}
	}
}

// Smart download that chooses the best method based on batch size
export async function downloadAllSmart(
	items: ImageItem[],
	options?: {
		forceZip?: boolean;
		forceFSAPI?: boolean;
		onMethodChosen?: (method: 'zip' | 'fsapi') => void;
		onProgress?: ZipProgressCallback;
	}
): Promise<void> {
	const validItems = items.filter(i => i.compressedBlob);
	
	if (validItems.length === 0) return;

	// If forcing a specific method
	if (options?.forceZip) {
		options.onMethodChosen?.('zip');
		return downloadAllAsZip(validItems, options.onProgress);
	}

	if (options?.forceFSAPI && isFileSystemAccessSupported()) {
		options.onMethodChosen?.('fsapi');
		return downloadWithFileSystemAPI(validItems);
	}

	// Auto-select based on batch size and browser support
	const shouldUseFSAPI = isLargeBatch(validItems) && isFileSystemAccessSupported();

	if (shouldUseFSAPI) {
		options?.onMethodChosen?.('fsapi');
		return downloadWithFileSystemAPI(validItems);
	}

	options?.onMethodChosen?.('zip');
	return downloadAllAsZip(validItems, options?.onProgress);
}

// Get download info for UI display
export function getDownloadInfo(items: ImageItem[]): {
	count: number;
	totalSize: number;
	totalSizeMB: number;
	isLarge: boolean;
	fsapiSupported: boolean;
	recommendedMethod: 'zip' | 'fsapi';
} {
	const validItems = items.filter(i => i.compressedBlob);
	const totalSize = validItems.reduce((acc, i) => acc + (i.compressedSize || 0), 0);
	const totalSizeMB = totalSize / (1024 * 1024);
	const isLarge = isLargeBatch(validItems);
	const fsapiSupported = isFileSystemAccessSupported();

	return {
		count: validItems.length,
		totalSize,
		totalSizeMB,
		isLarge,
		fsapiSupported,
		recommendedMethod: isLarge && fsapiSupported ? 'fsapi' : 'zip'
	};
}
