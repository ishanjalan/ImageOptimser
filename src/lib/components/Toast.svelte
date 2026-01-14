<script lang="ts" module>
	import { Check, X, AlertCircle, Info } from 'lucide-svelte';

	export type ToastType = 'success' | 'error' | 'info';

	export interface Toast {
		id: string;
		message: string;
		type: ToastType;
		duration?: number;
	}

	// Global toast state
	let toasts = $state<Toast[]>([]);

	export function addToast(message: string, type: ToastType = 'info', duration = 3000): string {
		const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
		
		toasts = [...toasts, { id, message, type, duration }];

		// Auto-dismiss
		if (duration > 0) {
			setTimeout(() => {
				removeToast(id);
			}, duration);
		}

		return id;
	}

	export function removeToast(id: string): void {
		toasts = toasts.filter(t => t.id !== id);
	}

	// Convenience methods
	export const toast = {
		success: (message: string, duration?: number) => addToast(message, 'success', duration),
		error: (message: string, duration?: number) => addToast(message, 'error', duration ?? 5000),
		info: (message: string, duration?: number) => addToast(message, 'info', duration)
	};
</script>

<script lang="ts">
	import { fly, fade } from 'svelte/transition';

	const icons = {
		success: Check,
		error: AlertCircle,
		info: Info
	};

	const styles = {
		success: 'bg-green-500/10 border-green-500/30 text-green-500',
		error: 'bg-red-500/10 border-red-500/30 text-red-500',
		info: 'bg-accent-start/10 border-accent-start/30 text-accent-start'
	};
</script>

{#if toasts.length > 0}
	<div
		class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm"
		role="region"
		aria-label="Notifications"
		aria-live="polite"
	>
		{#each toasts as toast (toast.id)}
			<div
				class="glass flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg {styles[toast.type]}"
				in:fly={{ x: 100, duration: 200 }}
				out:fade={{ duration: 150 }}
				role="alert"
			>
				<svelte:component this={icons[toast.type]} class="h-5 w-5 flex-shrink-0" />
				<p class="flex-1 text-sm font-medium text-surface-900 dark:text-surface-100">
					{toast.message}
				</p>
				<button
					onclick={() => removeToast(toast.id)}
					class="flex-shrink-0 rounded-lg p-1 text-surface-400 transition-colors hover:bg-surface-200 hover:text-surface-600 dark:hover:bg-surface-700 dark:hover:text-surface-300"
					aria-label="Dismiss notification"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		{/each}
	</div>
{/if}
