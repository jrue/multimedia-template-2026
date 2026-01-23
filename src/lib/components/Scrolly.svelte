<script context="module" lang="ts">
  export type Step = {
    img: string;              // filename/path under /static
    alt?: string;             // used as aria-label
    pos?: 'start' | 'center' | 'end';
    text: string;             // HTML string
  };
</script>

<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { base } from '$app/paths';



  // Preferred: build step provides this
  export let steps: Step[] | undefined;

  // Optional: paired shortcode body (if you decide to pass it through)
  export let bodyHtml: string | undefined;

  // Tuning knobs (optional)
  export let vhPerStep: number | string | undefined = 100;  // how tall each step is in vh
  export let fadeMs: number | string | undefined = 600;

  function toNum(v: number | string | undefined, fallback: number) {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  }

  const POS_CLASS: Record<string, string> = {
    start: 'col-10 col-sm-5 bg-body-secondary p-4',
    center: 'col-10 col-sm-6 bg-body-secondary p-4',
    end: 'col-10 col-sm-5 bg-body-secondary p-4'
  };


  function normalizeStaticPath(raw: string) {
    const s = raw.trim();
    if (!s) return s;

    // If it's already an absolute URL (https://...), leave it alone
    if (/^https?:\/\//i.test(s)) return s;

    // Ensure it starts with a single "/"
    const path = s.startsWith('/') ? s : '/' + s;

    // Prefix SvelteKit base path (e.g., "/multimedia-template-2026")
    return `${base}${path}`;
  }


  // ---- Parse JSON from bodyHtml (fallback) ----
  function stripHtmlToText(html: string) {
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

  function tryParseStepsFromBodyHtml(html: string | undefined): Step[] | null {
    if (!html) return null;
    const txt = stripHtmlToText(html);

    const start = txt.indexOf('[');
    const end = txt.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) return null;

    const json = txt.slice(start, end + 1);
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) return null;

      const coerced: Step[] = arr
        .map((x) => ({
          img: typeof x.img === 'string' ? x.img : '',
          alt: typeof x.alt === 'string' ? x.alt : undefined,
          pos: x.pos === 'start' || x.pos === 'center' || x.pos === 'end' ? x.pos : 'center',
          text: typeof x.text === 'string' ? x.text : ''
        }))
        .filter((s) => s.img && s.text);

      return coerced.length ? coerced : null;
    } catch {
      return null;
    }
  }

  $: resolvedSteps =
    (steps && steps.length ? steps : null) ??
    tryParseStepsFromBodyHtml(bodyHtml) ??
    [];

  $: stepHeightVh = toNum(vhPerStep, 100);
  $: fadeDurationMs = toNum(fadeMs, 600);

  // ---- Scrolly state ----
  let activeIndex = 0;

  // We render two layers for crossfade
  let topImg = '';
  let bottomImg = '';
  let fading = false;

  $: activeAlt = resolvedSteps[activeIndex]?.alt ?? '';

  $: if (resolvedSteps.length) {
    const first = normalizeStaticPath(resolvedSteps[0].img);
    topImg = first;
    bottomImg = first;
    activeIndex = 0;
  }

  let observer: IntersectionObserver | null = null;
  let stepEls: (HTMLElement | null)[] = [];

  function switchTo(index: number) {
    if (!resolvedSteps.length) return;
    const next = Math.max(0, Math.min(index, resolvedSteps.length - 1));
    if (next === activeIndex) return;

    const nextImg = normalizeStaticPath(resolvedSteps[next].img);

    bottomImg = nextImg;
    fading = true;

    window.setTimeout(() => {
      topImg = nextImg;
      fading = false;
    }, fadeDurationMs);

    activeIndex = next;
  }

  async function setupObserver() {
    if (!browser) return;

    observer?.disconnect();
    observer = null;

    if (!resolvedSteps.length) return;

    // Wait for DOM bindings
    await tick();

    // Extra safety: some very old browsers
    if (typeof IntersectionObserver === 'undefined') return;

    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];

        if (!visible) return;

        const idx = Number((visible.target as HTMLElement).dataset.stepIndex);
        if (Number.isFinite(idx)) switchTo(idx);
      },
      {
        root: null,
        rootMargin: '-40% 0px -40% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    );

    for (const el of stepEls) {
      if (el) observer.observe(el);
    }
  }


  onMount(() => {
    if (browser) setupObserver();
  });


  $: if (browser && resolvedSteps.length) {
    stepEls.length = resolvedSteps.length;
    setupObserver();
  }


  onDestroy(() => {
    observer?.disconnect();
    observer = null;
  });
</script>

{#if resolvedSteps.length}
  <section class="scrolly full-bleed" style={`--fade-ms:${fadeDurationMs}ms;`}>
    <div class="scrolly-bg" role="img" aria-label={activeAlt} style="height: 100vh; width: 100vw;">
      <div class="bg-layer top" style={`background-image:url("${encodeURI(topImg)}")`} aria-hidden="true"></div>
      <div
        class={"bg-layer bottom " + (fading ? 'show' : '')}
        style={`background-image:url("${bottomImg}")`}
        aria-hidden="true"
      ></div>
    </div>

    <div class="scrolly-steps">
      {#each resolvedSteps as step, i (i)}
        <div
          class="step"
          data-step-index={i}
          bind:this={stepEls[i]}
          style={`min-height:${stepHeightVh}vh;`}
        >
          <div class="container-fluid">
            <div
              class="row align-items-center px-md-4 px-lg-5"
              class:start={step.pos === 'start'}
              class:center={step.pos === 'center'}
              class:end={step.pos === 'end'}
              style="min-height: 100vh;"
            >

              <div class={POS_CLASS[step.pos ?? 'center']}>
                {@html step.text}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  .scrolly { position: relative; }

  .scrolly-bg {
    position: sticky;
    top: 0;
    left: 0;
    overflow: hidden;
    z-index: 0;
  }

  .bg-layer {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    transform: translateZ(0);
  }

  .bg-layer.top { opacity: 1; }

  .bg-layer.bottom {
    opacity: 0;
    transition: opacity var(--fade-ms) ease;
  }

  .bg-layer.bottom.show { opacity: 1; }

  .scrolly-steps { position: relative; z-index: 1; }

  .step { display: block; }

  .step :global(.bg-body-secondary) { border-radius: 0.5rem; }

  /* Horizontal positioning via flexbox */
  .row.start {
    justify-content: flex-start;
  }

  .row.center {
    justify-content: center;
  }

  .row.end {
    justify-content: flex-end;
  }

</style>
