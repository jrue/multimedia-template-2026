import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	css: {
		preprocessorOptions: {
			scss: {
				// 1) Reduce noise from dependencies (like Bootstrap)
				quietDeps: true,

				// 2) If your Sass version supports it, silence only the @import deprecation
				silenceDeprecations: ['import']
			}
		}
	}
});
