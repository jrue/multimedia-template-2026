<script lang="ts" context="module">
	export type Block =
		| { type: 'html'; html: string }
		| {
				type: 'shortcode';
				name: string;
				attrs: Record<string, any>;
				bodyHtml?: string; 
		  };
</script>

<script lang="ts">
	export let blocks: Block[] = [];

	// Import all components under $lib/components
	const modules = import.meta.glob('$lib/components/**/*.svelte', { eager: true });

	const registry: Record<string, any> = {};

	for (const [path, mod] of Object.entries(modules)) {
		const file = path.split('/').pop() ?? '';

		// EXCLUDE this renderer itself
		if (file === 'DocRenderer.svelte') continue;

		const base = file.replace(/\.svelte$/, '');
		// @ts-expect-error — Svelte component default export
		registry[base] = mod.default;
	}

	function getComponent(name: string) {
		return registry[name];
	}

	function toCamel(s: string) {
		return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
	}

	function normalizeAttrs(attrs: Record<string, any>) {
		const out: Record<string, any> = {};

		for (const [k, v] of Object.entries(attrs ?? {})) {
			const key = toCamel(k);

			// Preserve arrays and objects exactly (e.g. Scrolly.steps)
			if (v !== null && typeof v === 'object') {
				out[key] = v;
				continue;
			}

			// Normalize booleans that may arrive as strings
			if (v === 'true') {
				out[key] = true;
				continue;
			}
			if (v === 'false') {
				out[key] = false;
				continue;
			}

			// Normalize numeric strings when safe
			if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) {
				out[key] = Number(v);
				continue;
			}

			out[key] = v;
		}

		return out;
	}

</script>

{#each blocks as block, i (i)}
	{#if block.type === 'html'}
		{@html block.html}
	{:else if block.type === 'shortcode'}
		{#if getComponent(block.name)}
			<svelte:component
				this={getComponent(block.name)}
				{...normalizeAttrs(block.attrs)}
			/>
		{:else}
			<!-- no matching component: silently skip -->
		{/if}
	{/if}
{/each}
