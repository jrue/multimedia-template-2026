<!-- src/lib/components/VideoEmbed.svelte -->
<script lang="ts">
  export let src: string | undefined;

  export let title: string = '';
  export let size: 'full' | 'large' | 'fit' = 'large';
  export let caption: string | undefined;

  // These arrive as strings from shortcodes; allow booleans too.
  export let autoplay: boolean | string | undefined = false;
  export let controls: boolean | string | undefined = true;
  export let playsinline: boolean | string | undefined = true;
  export let mute: boolean | string | undefined = false;

  // Optional: for local files, allow captions track served from /static
  // Example shortcode: captions="/captions/my-video.vtt" srclang="en" label="English"
  export let captions: string | undefined;
  export let srclang: string = 'en';
  export let label: string = 'English';

  function toBool(v: boolean | string | undefined, fallback: boolean) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
      if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
    }
    return fallback;
  }

  function safeUrl(raw: string): URL | null {
    try {
      return new URL(raw);
    } catch {
      return null;
    }
  }

  function isYouTubeHost(host: string) {
    return host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be';
  }

  function isVimeoHost(host: string) {
    return host === 'vimeo.com' || host.endsWith('.vimeo.com') || host === 'player.vimeo.com';
  }

  function extractYouTubeId(u: URL): string | null {
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }

    if (u.pathname === '/watch') {
      return u.searchParams.get('v');
    }

    const embedMatch = u.pathname.match(/^\/embed\/([^/]+)/);
    if (embedMatch) return embedMatch[1];

    const shortsMatch = u.pathname.match(/^\/shorts\/([^/]+)/);
    if (shortsMatch) return shortsMatch[1];

    const liveMatch = u.pathname.match(/^\/live\/([^/]+)/);
    if (liveMatch) return liveMatch[1];

    return null;
  }

  function extractVimeoId(u: URL): string | null {
    const playerMatch = u.pathname.match(/^\/video\/(\d+)/);
    if (playerMatch) return playerMatch[1];

    const simpleMatch = u.pathname.match(/^\/(\d+)/);
    if (simpleMatch) return simpleMatch[1];

    const anyIdMatch = u.pathname.match(/\/(\d+)(?:$|\/)/);
    return anyIdMatch ? anyIdMatch[1] : null;
  }

  function isDirectVideoFile(raw: string) {
    return /\.(mp4|webm)(\?.*)?$/i.test(raw.trim());
  }

  function normalizeStaticPath(raw: string) {
    // If it's already absolute http(s), keep it.
    const s = raw.trim();
    if (/^https?:\/\//i.test(s)) return s;

    // Otherwise assume in /static (served at /...)
    if (s.startsWith('/')) return s;
    return '/' + s;
  }

  type Resolved =
    | { kind: 'youtube'; embedUrl: string }
    | { kind: 'vimeo'; embedUrl: string }
    | { kind: 'file'; fileUrl: string; mime: 'video/mp4' | 'video/webm' };

  function resolveVideo(rawSrc: string): Resolved | null {
    const s = rawSrc.trim();
    if (!s) return null;

    // Direct file
    if (isDirectVideoFile(s)) {
      const fileUrl = normalizeStaticPath(s);
      const mime = /\.webm(\?.*)?$/i.test(s) ? 'video/webm' : 'video/mp4';
      return { kind: 'file', fileUrl, mime };
    }

    // YouTube / Vimeo (absolute URLs)
    const u = safeUrl(s);
    if (!u) return null;

    const autoplayBool = toBool(autoplay, false);
    const controlsBool = toBool(controls, true);
    const playsinlineBool = toBool(playsinline, true);
    const muteBool = toBool(mute, false);

    if (isYouTubeHost(u.hostname)) {
      const id = extractYouTubeId(u);
      if (!id) return null;

      const params = new URLSearchParams();
      if (autoplayBool) params.set('autoplay', '1');
      params.set('controls', controlsBool ? '1' : '0');
      if (playsinlineBool) params.set('playsinline', '1');
      params.set('rel', '0');

      // YouTube: autoplay often requires muted
      if (muteBool) params.set('mute', '1');

      const qs = params.toString();
      const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}${
        qs ? `?${qs}` : ''
      }`;

      return { kind: 'youtube', embedUrl };
    }

    if (isVimeoHost(u.hostname)) {
      const id = extractVimeoId(u);
      if (!id) return null;

      const params = new URLSearchParams();
      if (autoplayBool) params.set('autoplay', '1');
      if (!controlsBool) params.set('controls', '0');
      if (playsinlineBool) params.set('playsinline', '1');

      // Vimeo: autoplay often requires muted
      if (muteBool) params.set('muted', '1');

      const qs = params.toString();
      const embedUrl = `https://player.vimeo.com/video/${encodeURIComponent(id)}${
        qs ? `?${qs}` : ''
      }`;

      return { kind: 'vimeo', embedUrl };
    }

    return null;
  }

  $: resolved = src ? resolveVideo(src) : null;

  // Normalize captions path if present (assume /static)
  $: captionsSrc = captions ? normalizeStaticPath(captions) : undefined;

  // Layout helpers
  $: wrapClass = 'float-md-start me-md-3 mb-3';
  const wrapStyle = 'max-width: 420px;';

  $: autoplayBool = toBool(autoplay, false);
  $: controlsBool = toBool(controls, true);
  $: playsinlineBool = toBool(playsinline, true);
  $: muteBool = toBool(mute, false);
</script>

{#if resolved}
  {#if size === 'full'}
    <figure class="my-3 full-bleed">
      <div class="ratio ratio-16x9">
        {#if resolved.kind === 'file'}
          <!-- svelte-ignore a11y_media_has_caption -->
          <video
            src={resolved.fileUrl}
            title={title}
            class="w-100 h-100"
            autoplay={autoplayBool}
            controls={controlsBool}
            muted={muteBool}
            playsinline={playsinlineBool}
          >
            {#if captionsSrc}
              <track kind="captions" src={captionsSrc} srclang={srclang} label={label} default />
            {/if}
          </video>
        {:else}
          <iframe
            src={resolved.embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        {/if}
      </div>

      {#if caption}
        <figcaption class="mt-2 text-muted small">{caption}</figcaption>
      {/if}
    </figure>

  {:else if size === 'large'}
    <figure class="my-3 full-bleed">
      <div class="container-fluid">
        <div class="row justify-content-center">
          <div class="col-12 col-lg-10 col-xxl-8">
            <div class="ratio ratio-16x9">
              {#if resolved.kind === 'file'}
                <!-- svelte-ignore a11y_media_has_caption -->
                <video
                  src={resolved.fileUrl}
                  title={title}
                  class="w-100 h-100"
                  autoplay={autoplayBool}
                  controls={controlsBool}
                  muted={muteBool}
                  playsinline={playsinlineBool}
                >
                  {#if captionsSrc}
                    <track kind="captions" src={captionsSrc} srclang={srclang} label={label} default />
                  {/if}
                </video>
              {:else}
                <iframe
                  src={resolved.embedUrl}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                ></iframe>
              {/if}
            </div>
          </div>
        </div>
      </div>

      {#if caption}
        <figcaption class="mt-2 text-muted small text-center">{caption}</figcaption>
      {/if}
    </figure>

  {:else if size === 'fit'}
    <figure class="my-3">
      <div class="ratio ratio-16x9">
        {#if resolved.kind === 'file'}
          <!-- svelte-ignore a11y_media_has_caption -->
          <video
            src={resolved.fileUrl}
            title={title}
            class="w-100 h-100"
            autoplay={autoplayBool}
            controls={controlsBool}
            muted={muteBool}
            playsinline={playsinlineBool}
          >
            {#if captionsSrc}
              <track kind="captions" src={captionsSrc} srclang={srclang} label={label} default />
            {/if}
          </video>
        {:else}
          <iframe
            src={resolved.embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        {/if}
      </div>

      {#if caption}
        <figcaption class="mt-2 text-muted small text-center">{caption}</figcaption>
      {/if}
    </figure>
  {/if}
{/if}
