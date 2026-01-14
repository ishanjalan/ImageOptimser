import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		exclude: ['@jsquash/jpeg', '@jsquash/png', '@jsquash/oxipng', '@jsquash/webp', '@jsquash/avif']
	},
	build: {
		target: 'esnext'
	},
	worker: {
		format: 'es'
	}
});
