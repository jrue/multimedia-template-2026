// svelte.config.js
import adapter from '@sveltejs/adapter-static';
import 'dotenv/config';

const dev = process.env.NODE_ENV !== 'production';

function normalizeBasePath(v) {
	if (!v) return '';
	let s = String(v).trim();
	if (!s) return '';
	if (!s.startsWith('/')) s = '/' + s;
	s = s.replace(/\/+$/, '');
	return s === '/' ? '' : s;
}

const base = dev ? '' : normalizeBasePath(process.env.BASE_PATH);

export default {
	kit: {
		adapter: adapter({
			// GitHub Pages recommends generating a 404.html fallback page
			fallback: '404.html'
		}),
		paths: { base }
	}
};
