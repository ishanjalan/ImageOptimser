<script lang="ts">
	import { images } from '$lib/stores/images.svelte';
	import ImageCard from './ImageCard.svelte';
	import { flip } from 'svelte/animate';
</script>

<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each images.items as item (item.id)}
		<div animate:flip={{ duration: 200 }}>
			<ImageCard {item} />
		</div>
	{/each}
</div>
