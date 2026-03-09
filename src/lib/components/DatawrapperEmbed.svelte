<script lang="ts">
	import { onMount } from 'svelte';

	//example shortcode [[DatawrapperEmbed id="cY0Bb" size="large"]]
	export let id: string | undefined;;
	export let size: 'full' | 'large' | 'fit' = 'fit';

	//list allowed sizes
	const allowedSizes = new Set(['full', 'large', 'fit']); 

	//merge into normalizedSize, fallback to fit if they set something else or don't set anything
	$: normalizedSize = allowedSizes.has(String(size)) ? (size as any) : 'fit';

	// keep this reactive so it updates if id changes. Also, append unique id for 
	// multiple datawrappers instances on the same page
  const uid = Math.random().toString(36).slice(2);
	$: containerId = id ? `datawrapper-vis-${id}-${uid}` : "";

	let hostEl: HTMLDivElement | null = null;
	
	onMount(() => {

		//fail gracefully if no id or host element
    if (!id || !hostEl) return;

    // ensure the host has the id Datawrapper will target
    hostEl.id = containerId;

    // avoid double-injection (HMR / navigation)
    if (hostEl.querySelector(`script[data-datawrapper="${id}"]`)) return;

    const script = document.createElement("script");
    script.src = `https://datawrapper.dwcdn.net/${id}/embed.js`;
    script.defer = true;
    script.setAttribute("data-target", `#${containerId}`);
    script.setAttribute("data-datawrapper", id);

    // append locally (keeps side effects scoped)
    hostEl.appendChild(script);

    return () => {
      script.remove();
      // optional: clear rendered iframe on teardown
      // hostEl.innerHTML = "";
    };
  });
</script>

{#if !id}
  <!-- Datawrapper is missing an id! -->
{:else if normalizedSize === "full"}
  <figure class="my-3 full-bleed">
    <div bind:this={hostEl}></div>
  </figure>
{:else if normalizedSize === "large"}
  <figure class="my-3 full-bleed">
    <div class="container-fluid">
      <div class="row justify-content-center">
        <div class="col-12 col-lg-10 col-xxl-8">
          <div bind:this={hostEl}></div>
        </div>
      </div>
    </div>
  </figure>
{:else}
  <figure class="my-3">
    <div bind:this={hostEl}></div>
  </figure>
{/if}
