// scripts/build-from-google-doc.mjs
import 'dotenv/config';
import fs from 'node:fs/promises';
import { parse } from 'node-html-parser';

const DOC_URL = process.env.DOC_URL;

/**
 * Extract Google Doc export HTML URL from standard doc URL.
 */
function extractGoogleDocExportUrl(url) {
  if (!url) return null;
  const m = url.match(/\/document\/d\/([^/]+)/);
  return m ? `https://docs.google.com/document/d/${m[1]}/export?output=html` : null;
}

/**
 * Google Docs wraps URLs in a redirect. This removes that redirect.
 * @param {string} href 
 * @returns {string} Return just the URL.
 */

function unwrapGoogleUrl(href) {
  try {
    const u = new URL(href);
    if (
      (u.hostname === 'www.google.com' || u.hostname === 'google.com') &&
      u.pathname === '/url' &&
      u.searchParams.has('q')
    ) {
      return u.searchParams.get('q');
    }
  } catch {}
  return href;
}

/**
 * Helper to see if this is a link or anchor.
 * @param {string} href 
 * @returns {string|null}
 */
function isExternalLink(href) {
  if (!href) return false;
  if (href.startsWith('#')) return false;
  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) return false;
  return /^https?:\/\//i.test(href);
}

/**
 * Decode basic HTML entities commonly introduced by Google Docs exports.
 * Includes smart quotes (&ldquo; &rdquo; etc) because they break shortcode parsing.
 */
function decodeBasicEntities(s) {
  if (!s) return s;

  return s
    // Smart double quotes
    .replace(/&ldquo;|&#8220;|&#x201C;/gi, '"')
    .replace(/&rdquo;|&#8221;|&#x201D;/gi, '"')
    // Smart single quotes
    .replace(/&lsquo;|&#8216;|&#x2018;/gi, "'")
    .replace(/&rsquo;|&#8217;|&#x2019;/gi, "'")
    // Common entities
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Parse attributes inside a shortcode token like:
 *   src="..." alt="..." size=large flag
 */
function parseShortcodeAttrs(raw) {
  raw = decodeBasicEntities(raw);

  const attrs = {};
  const re = /([A-Za-z_][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+)))?/g;

  let m;
  while ((m = re.exec(raw)) !== null) {
    const key = m[1];
    const val = m[2] ?? m[3] ?? m[4];
    attrs[key] = val === undefined ? true : val;
  }

  return attrs;
}

/**
 * Parse token [[Name ...]] or [[/Name]]
 */
function parseShortcodeToken(token) {
  const inner = decodeBasicEntities(token.slice(2, -2).trim()); // decode smart quotes inside token too
  if (!inner) return null;

  const closeMatch = inner.match(/^\/\s*([A-Za-z_][\w-]*)\s*$/);
  if (closeMatch) return { kind: 'close', name: closeMatch[1] };

  const openMatch = inner.match(/^([A-Za-z_][\w-]*)([\s\S]*)$/);
  if (!openMatch) return null;

  const name = openMatch[1];
  const attrRaw = (openMatch[2] ?? '').trim();

  return { kind: 'open', name, attrs: parseShortcodeAttrs(attrRaw) };
}

/**
 * Split cleaned HTML into blocks, supporting BOTH:
 * - self-closing: [[Name ...]]
 * - paired: [[Name ...]] ... [[/Name]]
 *
 * Output blocks:
 * - { type:'html', html }
 * - { type:'shortcode', name, attrs, bodyHtml? }
 */
function splitHtmlIntoBlocksWithPairedShortcodes(html) {
  const blocks = [];
  const tokenRe = /\[\[[\s\S]*?\]\]/g;

  let cursor = 0;
  let match;

  while ((match = tokenRe.exec(html)) !== null) {
    const tokenStart = match.index;
    const tokenEnd = tokenStart + match[0].length;
    const tokenText = match[0];

    // preceding HTML
    if (tokenStart > cursor) {
      const before = html.slice(cursor, tokenStart);
      if (before.trim()) blocks.push({ type: 'html', html: before });
    }

    const parsed = parseShortcodeToken(tokenText);

    // invalid token => literal html
    if (!parsed) {
      blocks.push({ type: 'html', html: tokenText });
      cursor = tokenEnd;
      continue;
    }

    // stray close => literal html
    if (parsed.kind === 'close') {
      blocks.push({ type: 'html', html: tokenText });
      cursor = tokenEnd;
      continue;
    }

    const name = parsed.name;
    const attrs = parsed.attrs;

    // find matching close
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const closeRe = new RegExp(String.raw`\[\[\s*\/\s*${escaped}\s*\]\]`, 'g');
    closeRe.lastIndex = tokenEnd;

    const closeMatch = closeRe.exec(html);

    if (closeMatch) {
      const closeStart = closeMatch.index;
      const closeEnd = closeStart + closeMatch[0].length;

      const bodyHtml = html.slice(tokenEnd, closeStart);

      blocks.push({ type: 'shortcode', name, attrs, bodyHtml });

      cursor = closeEnd;
      tokenRe.lastIndex = closeEnd;
    } else {
      blocks.push({ type: 'shortcode', name, attrs });
      cursor = tokenEnd;
    }
  }

  if (cursor < html.length) {
    const tail = html.slice(cursor);
    if (tail.trim()) blocks.push({ type: 'html', html: tail });
  }

  return blocks;
}

/**
 * Compilation transform for paired ImageEmbed:
 * - If block is ImageEmbed and has bodyHtml, extract first <img> from bodyHtml.
 * - Fill attrs.src / attrs.alt if missing.
 * - Drop bodyHtml so it won't render as HTML later.
 */
function compilePairedImageEmbed(block) {
  if (block.type !== 'shortcode') return block;
  if (block.name !== 'ImageEmbed') return block;
  if (!block.bodyHtml || !block.bodyHtml.trim()) return { ...block, bodyHtml: undefined };

  try {
    const root = parse(block.bodyHtml);
    const img = root.querySelector('img');

    const nextAttrs = { ...(block.attrs || {}) };

    if (img) {
      const embeddedSrc = img.getAttribute('src') || '';
      const embeddedAlt = img.getAttribute('alt') || '';

      if (!nextAttrs.src && embeddedSrc) nextAttrs.src = embeddedSrc;
      if (!nextAttrs.alt && embeddedAlt) nextAttrs.alt = embeddedAlt;
    }

    return {
      type: 'shortcode',
      name: block.name,
      attrs: nextAttrs
      // bodyHtml removed intentionally
    };
  } catch {
    return { type: 'shortcode', name: block.name, attrs: block.attrs || {} };
  }
}

function stripHtmlToText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;|&#x201C;|&#x201D;/gi, '"')
    .replace(/&lsquo;|&rsquo;|&#8216;|&#8217;|&#x2018;|&#x2019;/gi, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();
}

function compilePairedScrolly(block) {
  if (block.type !== 'shortcode') return block;
  if (block.name !== 'Scrolly') return block;
  if (!block.bodyHtml || !block.bodyHtml.trim()) return { ...block, bodyHtml: undefined };

  try {
    const txt = stripHtmlToText(block.bodyHtml);
    const start = txt.indexOf('[');
    const end = txt.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
      return { type: 'shortcode', name: block.name, attrs: block.attrs || {} };
    }

    const json = txt.slice(start, end + 1);
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) {
      return { type: 'shortcode', name: block.name, attrs: block.attrs || {} };
    }

    // coerce + validate
    const steps = arr
      .map((x) => ({
        img: typeof x.img === 'string' ? x.img : '',
        alt: typeof x.alt === 'string' ? x.alt : undefined,
        pos: x.pos === 'start' || x.pos === 'center' || x.pos === 'end' ? x.pos : 'center',
        text: typeof x.text === 'string' ? x.text : ''
      }))
      .filter((s) => s.img && s.text);

    const nextAttrs = { ...(block.attrs || {}) };
    nextAttrs.steps = steps;

    // remove bodyHtml so it doesn't render
    return { type: 'shortcode', name: block.name, attrs: nextAttrs };
  } catch {
    return { type: 'shortcode', name: block.name, attrs: block.attrs || {} };
  }
}


function compileBlocks(blocks) {
  return blocks.map((b) => compilePairedScrolly(compilePairedImageEmbed(b)));
}


/**
 * Clean/filter Google Doc HTML.
 */
function cleanAndFilterHtml(html) {
  const root = parse(html);
  const body = root.querySelector('body') ?? root;

  function buildClassStyleMap(rootNode) {
    const styleText = rootNode.querySelectorAll('style').map((s) => s.text).join('\n');
    const map = new Map();

    const ruleRe = /([^{]+)\{([^}]+)\}/g;
    let m;

    while ((m = ruleRe.exec(styleText)) !== null) {
      const selectorText = m[1];
      const decls = m[2].toLowerCase().replace(/\s+/g, '');

      const bold = /font-weight:(bold|[6-9]00)/.test(decls);
      const italic = /font-style:italic/.test(decls);
      const underline = /text-decoration:underline/.test(decls);

      if (!(bold || italic || underline)) continue;

      const selectors = selectorText.split(',').map((s) => s.trim());
      for (const sel of selectors) {
        const mm = sel.match(/^\.(\S+)$/);
        if (!mm) continue;

        const className = mm[1];
        const prev = map.get(className) || { bold: false, italic: false, underline: false };

        map.set(className, {
          bold: prev.bold || bold,
          italic: prev.italic || italic,
          underline: prev.underline || underline
        });
      }
    }

    return map;
  }

  const classStyleMap = buildClassStyleMap(root);

  const allowedTags = new Set([
    'P',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'UL',
    'OL',
    'LI',
    'IMG',
    'FIGURE',
    'TABLE',
    'THEAD',
    'TBODY',
    'TR',
    'TD',
    'TH',
    'A',
    'STRONG',
    'EM',
    'U',
    'CODE',
    'SPAN'
  ]);

  /**
   * Get rid of empty HTML like <span>&nbsp;</span> or empty <p></p> tags.
   * @param {string} htmlStr 
   * @returns {string|boolean}
   */

  function isMeaningful(htmlStr) {
    if (!htmlStr) return false;
    if (/<img\b/i.test(htmlStr)) return true;
    if (/<table\b/i.test(htmlStr)) return true;
    if (/<figure\b/i.test(htmlStr)) return true;

    const text = htmlStr
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, '')
      .replace(/\s+/g, '')
      .trim();

    return text.length > 0;
  }

  function toCleanNode(node) {
    if (node.nodeType === 3) return node.rawText;
    if (!node.tagName) return node.childNodes.map(toCleanNode).join('');

    const tag = node.tagName.toUpperCase();
    if (!allowedTags.has(tag)) return node.childNodes.map(toCleanNode).join('');

    const inner = node.childNodes.map(toCleanNode).join('');

    if (tag === 'A') {
      const rawHref = node.getAttribute('href') || '#';
      const cleanHref = unwrapGoogleUrl(rawHref);

      if (!isMeaningful(inner)) return '';

      if (isExternalLink(cleanHref)) {
        return `<a href="${cleanHref}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
      }

      return `<a href="${cleanHref}">${inner}</a>`;
    }

    if (tag === 'TABLE') {
      // Collect rows
      const rows = node.querySelectorAll('tr');

      if (!rows.length) return '';

      const headerRow = rows[0];
      const bodyRows = rows.slice(1);

      const thead = headerRow
        ? `<thead>${toCleanNode(headerRow)}</thead>`
        : '';

      const tbody = bodyRows.length
        ? `<tbody>${bodyRows.map(toCleanNode).join('')}</tbody>`
        : '';

      return `
        <div class="table-responsive">
          <table class="table table-striped">
            ${thead}
            ${tbody}
          </table>
        </div>
      `;
    }

    if (tag === 'TR') {
      const cells = node.childNodes.map(toCleanNode).join('');
      return `<tr>${cells}</tr>`;
    }


    if (tag === 'TH') {
      const inner = node.childNodes.map(toCleanNode).join('');
      if (!isMeaningful(inner)) return '';
      return `<th scope="col">${inner}</th>`;
    }

    if (tag === 'TD') {
      const inner = node.childNodes.map(toCleanNode).join('');
      if (!isMeaningful(inner)) return '';
      return `<td>${inner}</td>`;
    }





    if (tag === 'IMG') {
      const src = node.getAttribute('src');
      if (!src) return '';

      const alt = node.getAttribute('alt') || '';
      const width = node.getAttribute('width');
      const height = node.getAttribute('height');

      return `<figure class="docs-image figure"><img src="${src}" alt="${alt}" ${
        width ? `width="${width}"` : ''
      } ${height ? `height="${height}"` : ''} loading="lazy" class="figure-image img-fluid border" /></figure>`;
    }

    if (tag === 'SPAN') {
      if (!isMeaningful(inner)) return '';

      const classAttr = node.getAttribute('class') || '';
      const classes = classAttr.split(/\s+/).filter(Boolean);

      const styleRaw = node.getAttribute('style') || '';
      const style = styleRaw.toLowerCase().replace(/\s+/g, '');

      let bold = false;
      let italic = false;
      let underline = false;

      for (const c of classes) {
        const s = classStyleMap.get(c);
        if (s) {
          bold ||= s.bold;
          italic ||= s.italic;
          underline ||= s.underline;
        }
      }

      if (/font-weight:(bold|[6-9]00)/.test(style)) bold = true;
      if (/font-style:italic/.test(style)) italic = true;
      if (/text-decoration:underline/.test(style)) underline = true;

      let out = inner;
      if (underline) out = `<u>${out}</u>`;
      if (italic) out = `<em>${out}</em>`;
      if (bold) out = `<strong>${out}</strong>`;

      return out;
    }

    if (['STRONG', 'EM', 'U', 'B', 'I'].includes(tag)) {
      const map = { B: 'strong', I: 'em' };
      const lower = map[tag] || tag.toLowerCase();
      return isMeaningful(inner) ? `<${lower}>${inner}</${lower}>` : '';
    }

    const lower = tag.toLowerCase();
    const wrapped = `<${lower}>${inner}</${lower}>`;
    return isMeaningful(inner) ? wrapped : '';
  }

  const cleanedBlocks = body.childNodes.map((n) => toCleanNode(n).trim()).filter(Boolean);
  return cleanedBlocks.join('\n');
}

async function main() {
  console.log('Fetching HTML from Google Doc...');
  console.log('DOC_URL:', DOC_URL);

  const exportUrl = extractGoogleDocExportUrl(DOC_URL);
  if (!exportUrl) throw new Error('\x1b[31mDOC_URL missing\x1b[0m or not a Google Doc URL');

  const res = await fetch(exportUrl);
  if (!res.ok) throw new Error(`\x1b[31mFailed to fetch doc\x1b[0m: ${res.status} ${res.statusText}`);

  const html = await res.text();
  console.log('\nIMGs found in Google Doc:', (html.match(/<img\b/gi) || []).length);

  const cleanedHtml = cleanAndFilterHtml(html);

  // 1) tokenize (paired + self)
  const tokenized = splitHtmlIntoBlocksWithPairedShortcodes(cleanedHtml);

  // 2) compile transforms (ImageEmbed paired -> attrs.src/alt)
  const compiled = compileBlocks(tokenized);

  // Debug: show shortcode blocks
  // console.log('\n--- First 8 shortcode blocks (debug) ---\n');
  // console.log(
  //   compiled
  //     .filter((b) => b.type === 'shortcode')
  //     .slice(0, 8)
  //     .map((b) => ({
  //       name: b.name,
  //       attrs: b.attrs,
  //       hasBodyHtml: typeof b.bodyHtml === 'string' && b.bodyHtml.trim().length > 0
  //     }))
  // );
  // console.log('\n---------------------------------------\n');

  console.log('Short codes found in Doc:', compiled.filter((b) => b.type === 'shortcode').length);

  const outDir = 'src/lib';
  await fs.mkdir(outDir, { recursive: true });

  await fs.writeFile(`${outDir}/doc.cleaned.html`, cleanedHtml, 'utf8');
  await fs.writeFile(`${outDir}/doc.blocks.json`, JSON.stringify(compiled, null, 2), 'utf8');

  console.log(`\n\n\x1b[32mSUCCESS!\x1b[0m Parsed Google Doc contents to ${outDir}/doc.blocks.json\n`);
  console.log(`An HTML version is also provided in ${outDir}/doc.cleaned.html for debugging.\n`)
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
