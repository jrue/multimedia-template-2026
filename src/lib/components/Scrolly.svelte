<script context="module" lang="ts">
  export type Step = {
    img: string; // image OR video path/URL 
    alt?: string;
    pos?: "start" | "center" | "end";
    text: string; // HTML string
    kind?: "image" | "video";
  };
</script>

<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { browser } from "$app/environment";
  import { base } from "$app/paths";

  export let steps: Step[] | undefined;
  export let bodyHtml: string | undefined;

  // how tall each step is in vh
  export let vhPerStep: number | string | undefined = 100;

  // crossfade duration (ms)
  export let fadeMs: number | string | undefined = 600;

  // NEW: how far up from the bottom the text box sits (vh).
  // Set to 0 for "immediately visible" (at the bottom edge).
  export let textOffsetFromBottomVh: number | string | undefined = 0;

  // NEW: at what point should the *final* text start carrying the background away
  // (0 = top, 0.5 = middle, 1 = bottom). You asked for middle.
  export let lastCarryPoint: number | string | undefined = 0.5;

  let sectionEl: HTMLElement | null = null;

  // Release mechanics
  let released = false;
  let releaseTopPx = 0;
  let prevCarryOut = false;

  function getDocTop(el: HTMLElement) {
    // element's top relative to document
    return el.getBoundingClientRect().top + window.scrollY;
  }

  function toNum(v: number | string | undefined, fallback: number) {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  }

  $: stepHeightVh = toNum(vhPerStep, 100);
  $: fadeDurationMs = toNum(fadeMs, 600);
  $: textBottomVh = toNum(textOffsetFromBottomVh, 0);
  $: carryPoint = Math.max(0, Math.min(1, toNum(lastCarryPoint, 0.5)));

  const POS_CLASS: Record<string, string> = {
    start: "col-10 col-sm-5 bg-body-secondary p-4",
    center: "col-10 col-sm-6 bg-body-secondary p-4",
    end: "col-10 col-sm-5 bg-body-secondary p-4"
  };

  function normalizeStaticPath(raw: string) {
    const s = raw.trim();
    if (!s) return s;
    if (/^https?:\/\//i.test(s)) return s;
    const path = s.startsWith("/") ? s : "/" + s;
    return `${base}${path}`;
  }

  // ---- Parse JSON from bodyHtml (fallback) ----
  function stripHtmlToText(html: string) {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&ldquo;|&rdquo;/g, '"')
      .replace(/&lsquo;|&rsquo;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .trim();
  }

  function tryParseStepsFromBodyHtml(html: string | undefined): Step[] | null {
    if (!html) return null;
    const txt = stripHtmlToText(html);

    const start = txt.indexOf("[");
    const end = txt.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) return null;

    const json = txt.slice(start, end + 1);
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) return null;

      const coerced: Step[] = arr
        .map((x) => ({
          img: typeof x.img === "string" ? x.img : "",
          alt: typeof x.alt === "string" ? x.alt : undefined,
          pos: x.pos === "start" || x.pos === "center" || x.pos === "end" ? x.pos : "center",
          text: typeof x.text === "string" ? x.text : "",
          kind: x.kind === "image" || x.kind === "video" ? x.kind : undefined
        }))
        .filter((s) => s.img && s.text);

      return coerced.length ? coerced : null;
    } catch {
      return null;
    }
  }

  $: resolvedSteps =
    (steps && steps.length ? steps : null) ?? tryParseStepsFromBodyHtml(bodyHtml) ?? [];

  // ---- Media helpers ----
  type MediaKind = "image" | "video";
  type Media = { url: string; kind: MediaKind; alt: string };

  function guessKindFromUrl(url: string): MediaKind {
    const clean = url.split("?")[0].split("#")[0].toLowerCase();
    if (clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".ogv") || clean.endsWith(".ogg")) {
      return "video";
    }
    return "image";
  }

  function toMedia(step: Step): Media {
    const url = normalizeStaticPath(step.img);
    const kind = step.kind ?? guessKindFromUrl(url);
    return { url, kind, alt: step.alt ?? "" };
  }

  // ---- Preload (images + videos) ----
  let preloadDone = false;
  let preloadTotal = 0;
  let preloadLoaded = 0;

  async function preloadImage(url: string): Promise<void> {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // @ts-ignore
          if (img.decode) await img.decode();
        } catch {}
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });
  }

  async function preloadVideo(url: string): Promise<void> {
    await new Promise<void>((resolve) => {
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.playsInline = true;
      v.src = url;

      const done = () => resolve();
      v.addEventListener("loadeddata", done, { once: true });
      v.addEventListener("canplay", done, { once: true });
      v.addEventListener("error", done, { once: true });

      try {
        v.load();
      } catch {
        resolve();
      }
    });
  }

  async function preloadAllMedia(uniqueMedia: Media[]) {
    preloadDone = false;
    preloadTotal = uniqueMedia.length;
    preloadLoaded = 0;

    const tasks = uniqueMedia.map(async (m) => {
      try {
        if (m.kind === "image") await preloadImage(m.url);
        else await preloadVideo(m.url);
      } finally {
        preloadLoaded += 1;
      }
    });

    await Promise.allSettled(tasks);
    preloadDone = true;
  }

  function videoType(url: string) {
    const clean = url.split("?")[0].split("#")[0].toLowerCase();
    if (clean.endsWith(".mp4")) return "video/mp4";
    if (clean.endsWith(".webm")) return "video/webm";
    if (clean.endsWith(".ogv") || clean.endsWith(".ogg")) return "video/ogg";
    return undefined;
  }

  // For <svelte:head> preloads
  $: headMedia = resolvedSteps.map(toMedia);
  $: headUnique = Array.from(new Map(headMedia.map((m) => [m.url, m])).values());

  // ---- Background state (two persistent wrappers, wrapper opacity animates => videos fade too) ----
  let bgIndex = 0;

  let topMedia: Media | null = null;
  let bottomMedia: Media | null = null;

  let bottomShow = false;

  let topVideoEl: HTMLVideoElement | null = null;
  let bottomVideoEl: HTMLVideoElement | null = null;

  $: activeAlt = topMedia?.alt ?? "";

  // ---- DOM refs for trigger computation ----
  let textBoxEls: (HTMLElement | null)[] = [];
  let stepEls: (HTMLElement | null)[] = [];

  async function ensureVideoPlaying(el: HTMLVideoElement | null) {
    if (!el) return;
    try {
      await tick();
      const p = el.play();
      if (p && typeof (p as Promise<void>).catch === "function") (p as Promise<void>).catch(() => {});
    } catch {}
  }

  let fadeTimer: number | null = null;

  async function crossfadeTo(newBgIndex: number) {
    if (!resolvedSteps.length) return;

    const clamped = Math.max(0, Math.min(newBgIndex, resolvedSteps.length - 1));
    if (clamped === bgIndex) return;

    if (fadeTimer) {
      window.clearTimeout(fadeTimer);
      fadeTimer = null;
    }

    const nextMedia = toMedia(resolvedSteps[clamped]);

    bottomShow = false;
    await tick();

    bottomMedia = nextMedia;
    await tick();

    if (bottomMedia.kind === "video") {
      await ensureVideoPlaying(bottomVideoEl);
    }

    requestAnimationFrame(() => {
      bottomShow = true;
    });

    fadeTimer = window.setTimeout(async () => {
      topMedia = nextMedia;
      bottomShow = false;

      await tick();
      if (topMedia.kind === "video") {
        await ensureVideoPlaying(topVideoEl);
      }

      fadeTimer = null;
    }, fadeDurationMs);

    bgIndex = clamped;
  }

  // ---- Deterministic trigger logic (symmetric forward/backward) ----
  // Rule: when text box i reaches top => bg becomes i+1.
  // Special rule for LAST step: once its text reaches "middle of viewport", background should
  // stop being sticky and scroll away with it.
  //
  // Implementation:
  // - compute passedIndex = last i where textBox[i].top <= 0
  // - wantedBg = clamp(passedIndex + 1)
  // - compute "unstick" for final step when its text top <= carryY
  //   where carryY = viewportHeight * carryPoint
  let rafPending = false;
  let carryOut = false; // when true, background becomes non-sticky and scrolls away

  function computePassedIndex(): number {
    const eps = 1; // reduce jitter at 0
    let passed = -1;

    const lastIdx = textBoxEls.length - 1;
    const carryY = window.innerHeight * carryPoint;

    for (let i = 0; i < textBoxEls.length; i++) {
        const el = textBoxEls[i];
        if (!el) continue;

        const top = el.getBoundingClientRect().top;
        const threshold = i === lastIdx ? carryY : eps;
        if (top <= threshold) passed = i;
        else break;
    }

    return passed;
  }

  function updateCarryOut() {
    if (!resolvedSteps.length) {
      carryOut = false;
      released = false;
      prevCarryOut = false;
      return;
    }

    const lastIdx = resolvedSteps.length - 1;
    const el = textBoxEls[lastIdx];
    if (!el) {
      carryOut = false;
      released = false;
      prevCarryOut = false;
      return;
    }

    const top = el.getBoundingClientRect().top;
    const carryY = window.innerHeight * carryPoint;

    carryOut = top <= carryY;

    // Detect edge (off -> on) to "freeze" the sticky bg at current scroll position
    if (carryOut && !prevCarryOut) {
      // We are releasing RIGHT NOW
      if (sectionEl) {
        const sectionTop = getDocTop(sectionEl);
        // Place the absolute bg at the same place it appears on screen at release time.
        // While sticky, it's at viewport top (0), so document Y = window.scrollY.
        releaseTopPx = window.scrollY - sectionTop;
        released = true;
      }
    }

    // Detect edge (on -> off) when scrolling back up to re-stick
    if (!carryOut && prevCarryOut) {
      released = false;
    }

    prevCarryOut = carryOut;
  }

  function updateFromScroll() {
    rafPending = false;
    if (!resolvedSteps.length) return;

    const passed = computePassedIndex();
    const wantedBg = Math.min(resolvedSteps.length - 1, Math.max(0, passed + 1));
    crossfadeTo(wantedBg);

    updateCarryOut();
  }

  function onScrollOrResize() {
    if (!browser) return;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(updateFromScroll);
  }

  // ---- Init when steps change ----
  $: if (resolvedSteps.length) {
    bgIndex = 0;
    const first = toMedia(resolvedSteps[0]);
    topMedia = first;
    bottomMedia = first;
    bottomShow = false;

    carryOut = false;

    stepEls.length = resolvedSteps.length;
    textBoxEls.length = resolvedSteps.length;
  } else {
    bgIndex = 0;
    topMedia = null;
    bottomMedia = null;
    bottomShow = false;
    carryOut = false;

    stepEls = [];
    textBoxEls = [];
  }

  onMount(async () => {
    if (!browser) return;

    // Preload all unique media
    const mediaList = resolvedSteps.map(toMedia);
    const uniq = new Map<string, Media>();
    for (const m of mediaList) uniq.set(m.url, m);
    await preloadAllMedia([...uniq.values()]);

    await tick();

    if (topMedia?.kind === "video") {
      await ensureVideoPlaying(topVideoEl);
    }

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    // Sync immediately so step 1 text shows as soon as bg is sticky
    onScrollOrResize();
  });

  onDestroy(() => {
    if (fadeTimer) window.clearTimeout(fadeTimer);
    fadeTimer = null;

    if (browser) {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    }
  });
</script>

<svelte:head>
  {#each headUnique as m (m.url)}
    {#if m.kind === "image"}
      <link rel="preload" as="image" href={m.url} />
    {:else}
      <link rel="preload" as="video" href={m.url} type={videoType(m.url)} />
    {/if}
  {/each}
</svelte:head>

{#if resolvedSteps.length}
  <section class="scrolly full-bleed" style={`--fade-ms:${fadeDurationMs}ms; --text-bottom:${textBottomVh}vh;`}>
    <!--
      carryOut = false => sticky background pinned to top
      carryOut = true  => background becomes normal (scrolls away with last text)
    -->
    <div class={"scrolly-bg " + (released ? "unstick" : "")} role="img" aria-label={activeAlt} style={`height: 100vh; width: 100vw;${released ? ` top: ${releaseTopPx}px;` : ''}`}>
      {#if topMedia}
        <div class="layer layer-top" aria-hidden="true">
          {#if topMedia.kind === "image"}
            <div class="media image" style={`background-image:url("${encodeURI(topMedia.url)}")`}></div>
          {:else}
            <video
              class="media video"
              bind:this={topVideoEl}
              src={topMedia.url}
              muted
              autoplay
              playsinline
              loop
              preload="auto"
            ></video>
          {/if}
        </div>
      {/if}

      {#if bottomMedia}
        <div class={"layer layer-bottom " + (bottomShow ? "show" : "")} aria-hidden="true">
          {#if bottomMedia.kind === "image"}
            <div class="media image" style={`background-image:url("${encodeURI(bottomMedia.url)}")`}></div>
          {:else}
            <video
              class="media video"
              bind:this={bottomVideoEl}
              src={bottomMedia.url}
              muted
              autoplay
              playsinline
              loop
              preload="auto"
            ></video>
          {/if}
        </div>
      {/if}

      {#if !preloadDone}
        <div class="preload-hint">Loading media… {preloadLoaded}/{preloadTotal}</div>
      {/if}
    </div>

    <div class="scrolly-steps">
      {#each resolvedSteps as step, i (i)}
        <div class="step" bind:this={stepEls[i]} style={`min-height:${stepHeightVh}vh;`}>
          <div class="container-fluid">
            <div
              class="row px-md-4 px-lg-5 align-items-start step-row"
              class:start={step.pos === "start"}
              class:center={step.pos === "center"}
              class:end={step.pos === "end"}
            >
              <!-- text box is what we use for the "hits the top" trigger -->
              <div class={POS_CLASS[step.pos ?? "center"]} bind:this={textBoxEls[i]}>
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
  .scrolly {
    position: relative;
  }

  /* Sticky by default */
  .scrolly-bg {
    position: sticky;
    top: 0;
    left: 0;
    overflow: hidden;
    z-index: 0;
  }

  /* When last text reaches middle, background scrolls away with content */
  .scrolly-bg.unstick {
    position: absolute;
  }

  /* Background layers */
  .layer {
    position: absolute;
    inset: 0;
    transform: translateZ(0);
  }

  .layer-top {
    opacity: 1;
  }

  /* Fade is on wrapper => videos fade too */
  .layer-bottom {
    opacity: 0;
    transition: opacity var(--fade-ms) ease;
  }

  .layer-bottom.show {
    opacity: 1;
  }

  .media {
    position: absolute;
    inset: 0;
  }

  /* Images */
  .media.image {
    background-size: cover;
    background-position: center;
  }

  /* Videos */
  .media.video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  /* Steps above background */
  .scrolly-steps {
    position: relative;
    z-index: 1;
  }

  .step {
    display: block;
  }

  /*
    IMPORTANT CHANGE:
    Previously you had padding-bottom: 15vh, which made the text appear "late".
    Now default is 0vh (immediate). You can dial it up via textOffsetFromBottomVh.
  */
  .step-row {
    min-height: 100vh;
    padding-bottom: var(--text-bottom);
  }

  .step :global(.bg-body-secondary) {
    border-radius: 0.5rem;
  }

  /* Horizontal positioning */
  .row.start {
    justify-content: flex-start;
  }
  .row.center {
    justify-content: center;
  }
  .row.end {
    justify-content: flex-end;
  }

  .preload-hint {
    position: absolute;
    left: 1rem;
    bottom: 1rem;
    z-index: 2;
    padding: 0.35rem 0.6rem;
    border-radius: 0.5rem;
    background: rgba(0, 0, 0, 0.45);
    color: white;
    font-size: 0.9rem;
    pointer-events: none;
  }
</style>