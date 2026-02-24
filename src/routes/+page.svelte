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
<header class="container-fluid d-flex flex-column align-items-center justify-content-center vh-100 mb-4" style="background-image:url('hero-example.png');background-size:cover;background-position:center;">
  <h1 class="text-white text-center display-1">Multimedia Template 2026</h1>
  <p class="text-white fw-light text-center">This is an example of the 2026 <a class="text-light" href="https://github.com/jrue/multimedia-template-2026" target="_blank">multimedia template</a> using Svelte.<br> This topper (header) is hard coded in <code>+page.svelte</code> file, while the rest of the page is imported from a <a class="text-light" href="https://docs.google.com/document/d/1JaxRkCqZyeWIPwXXocAwUoFaPsqULiQI_Oiby_F0JZ8/edit?usp=sharing" target="_blank">Google Doc</a>.</p>
</header>


<!-- DO NOT EDIT (except to modify classes). This will become code imported from Google Doc. -->
<div class="container">
  <div class="row justify-content-center">
    <div class="col-12 col-sm-10 col-lg-8 col-xxl-6">
      <DocRenderer {blocks} />
    </div>
  </div>
</div>


<!-- Hard-code any custom code that should appear AFTER Google Doc below here. -->
<footer class="container-fluid bg-dark text-white p-5">
  <p class="text-center">See template on <a class="text-white" href="https://github.com/jrue/multimedia-template-2026" target="_blank">Github</a></p>
</footer>