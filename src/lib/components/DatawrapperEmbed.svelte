<script lang="ts">
	import { onMount } from 'svelte';

	export let id: string | undefined;;

	let containerId = `datawrapper-vis-${id}`;

  // replicates datawrapper embed script code!
	onMount(() => {
		const script = document.createElement('script');
		script.src = `https://datawrapper.dwcdn.net/${id}/embed.js`;
		script.defer = true;
		script.setAttribute('data-target', `#${containerId}`);
		document.body.appendChild(script);
	});
</script>

<div id={containerId}></div>
