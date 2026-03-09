import { resolve } from '$app/paths';

// ---- Types ----

export type Step = {
	img: string; // image OR video path/URL
	alt?: string;
	pos?: 'start' | 'center' | 'end';
	text: string; // HTML string
	kind?: 'image' | 'video';
	// When set on a video step, the video does not autoplay. A button with this
	// label is rendered in the text box. After the video ends the button switches
	// to "Replay". Each video step manages its own play/replay state independently.
	videoActionText?: string;
};

export type MediaKind = 'image' | 'video';

export type Media = { url: string; kind: MediaKind; alt: string };

// ---- Layout ----

export const POS_CLASS: Record<string, string> = {
	start: 'col-10 col-sm-5 bg-body-secondary p-4',
	center: 'col-10 col-sm-6 bg-body-secondary p-4',
	end: 'col-10 col-sm-5 bg-body-secondary p-4'
};

// ---- Numeric coercion ----

export function toNum(v: number | string | undefined, fallback: number): number {
	if (typeof v === 'number') return v;
	if (typeof v === 'string') {
		const n = Number(v);
		return Number.isFinite(n) ? n : fallback;
	}
	return fallback;
}

// ---- Path helpers ----

export function normalizeStaticPath(raw: string): string {
	const s = raw.trim();
	if (!s) return s;
	if (/^https?:\/\//i.test(s)) return s;
	const path = s.startsWith('/') ? s : '/' + s;
	// resolve('/') returns the base with a trailing slash (e.g. "/my-app/").
	// Stripping that slash gives the same prefix that the deprecated `base` provided.
	const basePrefix = resolve('/').slice(0, -1);
	return basePrefix + path;
}

// ---- HTML / text utilities ----

export function stripHtmlToText(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>\s*<p>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&ldquo;|&rdquo;/g, '"')
		.replace(/&lsquo;|&rsquo;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&amp;/g, '&')
		.trim();
}

// ---- Media helpers ----

export function guessKindFromUrl(url: string): MediaKind {
	const clean = url.split('?')[0].split('#')[0].toLowerCase();
	if (
		clean.endsWith('.mp4') ||
		clean.endsWith('.webm') ||
		clean.endsWith('.ogv') ||
		clean.endsWith('.ogg')
	) {
		return 'video';
	}
	return 'image';
}

export function videoType(url: string): string | undefined {
	const clean = url.split('?')[0].split('#')[0].toLowerCase();
	if (clean.endsWith('.mp4')) return 'video/mp4';
	if (clean.endsWith('.webm')) return 'video/webm';
	if (clean.endsWith('.ogv') || clean.endsWith('.ogg')) return 'video/ogg';
	return undefined;
}

export function toMedia(step: Step): Media {
	const url = normalizeStaticPath(step.img);
	const kind = step.kind ?? guessKindFromUrl(url);
	return { url, kind, alt: step.alt ?? '' };
}

// ---- bodyHtml step parsing ----

export function tryParseStepsFromBodyHtml(html: string | undefined): Step[] | null {
	if (!html) return null;
	const txt = stripHtmlToText(html);

	const start = txt.indexOf('[');
	const end = txt.lastIndexOf(']');
	if (start === -1 || end === -1 || end <= start) return null;

	try {
		const arr = JSON.parse(txt.slice(start, end + 1));
		if (!Array.isArray(arr)) return null;

		const coerced: Step[] = arr
			.map((x) => ({
				img: typeof x.img === 'string' ? x.img : '',
				alt: typeof x.alt === 'string' ? x.alt : undefined,
				pos: x.pos === 'start' || x.pos === 'center' || x.pos === 'end' ? x.pos : 'center',
				text: typeof x.text === 'string' ? x.text : '',
				kind: x.kind === 'image' || x.kind === 'video' ? x.kind : undefined,
				videoActionText:
					typeof x.videoActionText === 'string' ? x.videoActionText : undefined
			}))
			.filter((s) => s.img && s.text);

		return coerced.length ? coerced : null;
	} catch {
		return null;
	}
}
