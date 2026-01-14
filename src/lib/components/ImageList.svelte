<script lang="ts">
	import { images } from '$lib/stores/images.svelte';
	import ImageCard from './ImageCard.svelte';
	import { flip } from 'svelte/animate';
	import { GripVertical } from 'lucide-svelte';

	let draggedId = $state<string | null>(null);
	let dragOverId = $state<string | null>(null);

	function handleDragStart(e: DragEvent, id: string) {
		draggedId = id;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', id);
		}
	}

	function handleDragEnd() {
		draggedId = null;
		dragOverId = null;
	}

	function handleDragOver(e: DragEvent, id: string) {
		e.preventDefault();
		if (draggedId && draggedId !== id) {
			dragOverId = id;
		}
	}

	function handleDragLeave() {
		dragOverId = null;
	}

	function handleDrop(e: DragEvent, targetId: string) {
		e.preventDefault();
		if (draggedId && draggedId !== targetId) {
			images.reorderItems(draggedId, targetId);
		}
		draggedId = null;
		dragOverId = null;
	}
</script>

<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
	{#each images.items as item (item.id)}
		<div
			class="relative {draggedId === item.id ? 'opacity-50' : ''} {dragOverId === item.id ? 'ring-2 ring-accent-start ring-offset-2 rounded-2xl' : ''}"
			animate:flip={{ duration: 200 }}
			draggable="true"
			ondragstart={(e) => handleDragStart(e, item.id)}
			ondragend={handleDragEnd}
			ondragover={(e) => handleDragOver(e, item.id)}
			ondragleave={handleDragLeave}
			ondrop={(e) => handleDrop(e, item.id)}
			role="listitem"
		>
			<!-- Drag handle indicator -->
			<div class="absolute top-3 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 cursor-grab active:cursor-grabbing pointer-events-none">
				<GripVertical class="h-4 w-4" />
			</div>
			<ImageCard {item} />
		</div>
	{/each}
</div>

{#if images.items.length > 1}
	<p class="mt-4 text-center text-xs text-surface-400">
		Drag cards to reorder • Order affects ZIP download
	</p>
{/if}
