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
    <figure class="my-3 full-bleed">
      <div class="ratio ratio-16x9">
        <iframe src={src} title={title} allowfullscreen></iframe>
      </div>

      {#if credit}
        <figcaption class="figure-caption text-muted mt-2">credit: {credit}</figcaption>
      {/if}
    </figure>

  {:else if size === 'large'}
    <figure class="my-3 full-bleed">
      <div class="container-fluid">
        <div class="row justify-content-center">
          <div class="col-12 col-lg-10 col-xxl-8">
            <div class="ratio ratio-16x9">
              <iframe src={src} title={title} allowfullscreen></iframe>
            </div>
          </div>
        </div>
      </div>

      {#if credit}
        <figcaption class="figure-caption text-muted mt-2 text-center">credit: {credit}</figcaption>
      {/if}
    </figure>

  {:else}
    <!-- fit -->
    <figure class="my-3">
      <div class="ratio ratio-16x9">
        <iframe src={src} title={title} allowfullscreen></iframe>
      </div>

      {#if credit}
        <figcaption class="figure-caption text-muted mt-2">credit: {credit}</figcaption>
      {/if}
    </figure>
  {/if}
{/if}
