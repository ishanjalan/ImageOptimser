<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Toast from '$lib/components/Toast.svelte';
	import { base } from '$app/paths';

	let { children } = $props();

	const siteUrl = 'https://ishanjalan.github.io/ImageOptimser';
	const ogImage = `${siteUrl}/og-image.svg`;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Squish - Free Image Optimizer</title>

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={siteUrl} />
	<meta property="og:title" content="Squish - Free Image Optimizer" />
	<meta property="og:description" content="Compress JPEG, PNG, WebP, AVIF, and SVG files instantly in your browser. 100% private - your images never leave your device." />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="Squish" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Squish - Free Image Optimizer" />
	<meta name="twitter:description" content="Compress JPEG, PNG, WebP, AVIF, and SVG files instantly in your browser. 100% private - your images never leave your device." />
	<meta name="twitter:image" content={ogImage} />

	<!-- Additional SEO -->
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href={siteUrl} />
</svelte:head>

{@render children()}

<!-- Global Toast Container -->
<Toast />
