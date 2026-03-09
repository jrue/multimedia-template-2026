<script lang="ts">
	/**
	 * Example shortcode usage:
	 * [[CoolNewFeature src="https://example.com/embed" size="large" credit="Name" title="Optional title"]]
	 */

	export let src: string | undefined;
	export let size: 'full' | 'large' | 'fit' = 'large';
	export let credit: string | undefined;
	export let title: string = '';
</script>

{#if src}
	{#if size === 'full'}
		<figure class="full-bleed my-4">
			<iframe {src} {title} class="aspect-video w-full" allowfullscreen></iframe>

			{#if credit}
				<figcaption class="mt-2 text-sm text-gray-500">credit: {credit}</figcaption>
			{/if}
		</figure>
	{:else if size === 'large'}
		<figure class="full-bleed my-4">
			<div class="flex justify-center">
				<div class="w-full lg:w-5/6 2xl:w-2/3">
					<iframe {src} {title} class="aspect-video w-full" allowfullscreen></iframe>
				</div>
			</div>

			{#if credit}
				<figcaption class="mt-2 text-center text-sm text-gray-500">credit: {credit}</figcaption>
			{/if}
		</figure>
	{:else}
		<!-- fit -->
		<figure class="my-4">
			<iframe {src} {title} class="aspect-video w-full" allowfullscreen></iframe>

			{#if credit}
				<figcaption class="mt-2 text-sm text-gray-500">credit: {credit}</figcaption>
			{/if}
		</figure>
	{/if}
{/if}
