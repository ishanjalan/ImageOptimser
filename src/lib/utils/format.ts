/**
 * Format bytes to human-readable string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(i > 1 ? 2 : 1)) + ' ' + sizes[i];
}

/**
 * Format a percentage (e.g., 75 -> "75%")
 */
export function formatPercent(value: number): string {
	return `${Math.round(value)}%`;
}
