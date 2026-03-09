<script lang="ts">
	import rawBlocks from '$lib/doc.blocks.json';
	import DocRenderer from '$lib/components/DocRenderer.svelte';
	import type { Block } from '$lib/components/DocRenderer.svelte';
	const blocks = rawBlocks as Block[];
</script>

<!--
Hard-code custom code that should appear BEFORE Google Doc here.
This code is in +page.svelte and can be manually coded using HTML or Svelte tags.
-->
<header
	class="mb-6 flex h-screen w-full flex-col items-center justify-center"
	style="background-image:url('hero-example.png');background-size:cover;background-position:center;"
>
	<h1 class="mb-4 font-display text-7xl font-light text-white">Multimedia Template 2026</h1>
	<p class="text-center leading-relaxed font-medium text-white">
		This is an example of the 2026 <a
			class="text-white/80 underline"
			href="https://github.com/jrue/multimedia-template-2026"
			target="_blank">multimedia template</a
		>
		using Svelte.<br /> This topper (header) is hard coded in
		<code class="text-white">+page.svelte</code>
		file, while the rest of the page is imported from a
		<a
			class="text-white/80 underline"
			href="https://docs.google.com/document/d/1JaxRkCqZyeWIPwXXocAwUoFaPsqULiQI_Oiby_F0JZ8/edit?usp=sharing"
			target="_blank">Google Doc</a
		>.
	</p>
</header>

<!-- DO NOT EDIT (except to modify classes). This will become code imported from Google Doc. -->
<div class="mx-auto px-4">
	<div class="flex flex-wrap justify-center">
		<div class="prose w-full">
			<DocRenderer {blocks} />
		</div>
	</div>
</div>

<!-- Hard-code any custom code that should appear AFTER Google Doc below here. -->
<footer class="w-full bg-gray-900 p-12 text-white">
	<p class="text-center">
		See template on <a
			class="text-white"
			href="https://github.com/jrue/multimedia-template-2026"
			target="_blank">Github</a
		>
	</p>
</footer>
