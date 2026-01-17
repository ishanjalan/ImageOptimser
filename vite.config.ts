import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		// Exclude WASM packages from pre-bundling (they need special handling)
		exclude: ['icodec']
	},
	build: {
		target: 'esnext'
	},
	worker: {
		// Use ES modules for workers (required for dynamic imports in workers)
		format: 'es',
		plugins: () => [
			// Apply same plugins to workers
			tailwindcss()
		],
		rollupOptions: {
			output: {
				// Ensure proper chunking for workers
				format: 'es',
				// Don't inline WASM modules
				inlineDynamicImports: false
			}
		}
	}
});
