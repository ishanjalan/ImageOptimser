import JSZip from 'jszip';
import type { ImageItem } from '$lib/stores/images.svelte';
import { getOutputFilename } from './compress';

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

export async function downloadAllAsZip(items: ImageItem[]) {
	const zip = new JSZip();

	// Track filenames to avoid duplicates
	const usedNames = new Map<string, number>();

	for (const item of items) {
		if (!item.compressedBlob) continue;

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

	const content = await zip.generateAsync({ type: 'blob' });
	downloadBlob(content, `optimized-images-${Date.now()}.zip`);
}
