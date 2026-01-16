<script lang="ts">
	import { onMount } from 'svelte';

	let {
		value,
		duration = 500,
		format = (n: number) => n.toString()
	}: {
		value: number;
		duration?: number;
		format?: (n: number) => string;
	} = $props();

	let displayValue = $state(0);
	let animationFrame: number | null = null;
	let startValue = $state(0);
	let startTime = $state<number | null>(null);
	let targetValue = $state(0);
	let initialized = $state(false);

	// Easing function for smooth animation
	function easeOutExpo(t: number): number {
		return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
	}

	function animate(timestamp: number) {
		if (startTime === null) {
			startTime = timestamp;
		}

		const elapsed = timestamp - startTime;
		const progress = Math.min(elapsed / duration, 1);
		const easedProgress = easeOutExpo(progress);

		displayValue = startValue + (targetValue - startValue) * easedProgress;

		if (progress < 1) {
			animationFrame = requestAnimationFrame(animate);
		} else {
			displayValue = targetValue;
			animationFrame = null;
			startTime = null;
		}
	}

	$effect(() => {
		// When value changes, start animation
		const newValue = value;
		
		if (!initialized) {
			displayValue = newValue;
			targetValue = newValue;
			initialized = true;
			return;
		}
		
		// Cancel any existing animation
		if (animationFrame !== null) {
			cancelAnimationFrame(animationFrame);
		}

		// Start from current display value for smooth transitions
		startValue = displayValue;
		targetValue = newValue;
		startTime = null;
		
		// Only animate if value actually changed
		if (startValue !== newValue) {
			animationFrame = requestAnimationFrame(animate);
		}
	});

	onMount(() => {
		return () => {
			if (animationFrame !== null) {
				cancelAnimationFrame(animationFrame);
			}
		};
	});
</script>

<span class="tabular-nums">{format(displayValue)}</span>
