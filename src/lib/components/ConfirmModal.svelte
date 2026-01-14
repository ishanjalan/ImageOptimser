<script lang="ts">
	import { AlertTriangle, X } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';
	import { focusTrap } from '$lib/utils/focus-trap';

	let {
		open = false,
		title = 'Confirm',
		message = 'Are you sure?',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		variant = 'danger' as 'danger' | 'warning' | 'info',
		onconfirm,
		oncancel
	}: {
		open: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'danger' | 'warning' | 'info';
		onconfirm: () => void;
		oncancel: () => void;
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			oncancel();
		}
		if (e.key === 'Enter') {
			onconfirm();
		}
	}

	const variantStyles = {
		danger: {
			icon: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
			button: 'bg-red-500 hover:bg-red-600 text-white'
		},
		warning: {
			icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
			button: 'bg-amber-500 hover:bg-amber-600 text-white'
		},
		info: {
			icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
			button: 'bg-blue-500 hover:bg-blue-600 text-white'
		}
	};
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		onkeydown={handleKeydown}
		use:focusTrap
	>
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			onclick={oncancel}
			aria-label="Close modal"
			transition:fade={{ duration: 150 }}
		></button>

		<!-- Modal -->
		<div
			class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-surface-900"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Close button -->
			<button
				onclick={oncancel}
				class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800"
				aria-label="Close"
			>
				<X class="h-5 w-5" />
			</button>

			<!-- Icon -->
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full {variantStyles[variant].icon}"
			>
				<AlertTriangle class="h-6 w-6" />
			</div>

			<!-- Content -->
			<h3 id="modal-title" class="mb-2 text-center text-lg font-semibold text-surface-900 dark:text-surface-100">
				{title}
			</h3>
			<p class="mb-6 text-center text-sm text-surface-500">
				{message}
			</p>

			<!-- Actions -->
			<div class="flex gap-3">
				<button
					onclick={oncancel}
					class="flex-1 rounded-xl bg-surface-100 px-4 py-2.5 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
				>
					{cancelText}
				</button>
				<button
					onclick={onconfirm}
					class="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors {variantStyles[variant].button}"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
