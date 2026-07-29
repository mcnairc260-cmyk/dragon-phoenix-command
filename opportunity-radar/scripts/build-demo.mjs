// Bundles the Vite production build into ONE self-contained HTML file for
// static single-file hosts (e.g. a Claude Artifact) that block external
// requests. Inlines the CSS and JS, and embeds the brand webfonts as base64
// so DPA typography survives a strict CSP.
//
// Usage: npm run build:demo   (runs `vite build` with hash routing first)

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const outDir = path.join(root, 'dist-demo');
const fontCache = path.join(root, 'scripts', '.fontcache');

// Modern UA so Google Fonts serves woff2 rather than legacy formats.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function cached(name, fetcher) {
  await mkdir(fontCache, { recursive: true });
  const file = path.join(fontCache, name);
  if (existsSync(file)) return readFile(file);
  const buf = await fetcher();
  await writeFile(file, buf);
  return buf;
}

/**
 * Fetch the Google Fonts stylesheet and inline every woff2 it references as a
 * data: URI. Returns '' if the network is unavailable — the caller then keeps
 * the CSS fallback stack rather than failing the build.
 */
async function buildFontFaces(cssUrl) {
  const cssBuf = await cached('fonts.css', async () => {
    const res = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`font css ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  });

  let css = cssBuf.toString('utf8');

  // Keep only the `latin` subset. The app ships English copy, and embedding
  // cyrillic/greek/vietnamese as base64 quadruples the page for no benefit.
  const latinBlocks = [...css.matchAll(/\/\*\s*latin\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)].map(
    (m) => m[1],
  );
  if (latinBlocks.length) css = latinBlocks.join('\n');

  const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]))];

  let inlined = 0;
  for (const url of urls) {
    const name = url.split('/').pop();
    const buf = await cached(name, async () => {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`font ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    });
    css = css.split(url).join(`data:font/woff2;base64,${buf.toString('base64')}`);
    inlined++;
  }
  const families = [...new Set([...css.matchAll(/font-family:\s*'([^']+)'/g)].map((m) => m[1]))];
  console.log(`  embedded ${inlined} font file(s) covering: ${families.join(', ')}`);
  if (families.length < 2) {
    throw new Error(`expected Cinzel and Inter, got: ${families.join(', ') || 'none'}`);
  }
  return css;
}

const html = await readFile(path.join(dist, 'index.html'), 'utf8');
const assets = await readdir(path.join(dist, 'assets'));
const cssFile = assets.find((f) => f.endsWith('.css'));
const jsFile = assets.find((f) => f.endsWith('.js'));
if (!cssFile || !jsFile) throw new Error('expected one .css and one .js in dist/assets');

let css = await readFile(path.join(dist, 'assets', cssFile), 'utf8');
const js = await readFile(path.join(dist, 'assets', jsFile), 'utf8');

// Replace the blocked @import with self-contained @font-face rules.
// Vite minifies to `@import"URL";` (no url(), no space), so accept both forms.
// The URL contains ';' (wght@600;700;800) — capture to the closing quote or
// paren, never to the first ';', or the request silently loses families.
const quoted = css.match(
  /@import\s*(?:url\(\s*)?(["'])(https:\/\/fonts\.googleapis\.com[^"']+)\1\s*\)?\s*;/,
);
const bare = css.match(/@import\s*url\(\s*(https:\/\/fonts\.googleapis\.com[^)]+)\)\s*;/);
const importMatch = quoted
  ? { full: quoted[0], url: quoted[2] }
  : bare
    ? { full: bare[0], url: bare[1] }
    : null;

if (importMatch) {
  css = css.replace(importMatch.full, '');
  try {
    const faces = await buildFontFaces(importMatch.url);
    css = faces + '\n' + css;
  } catch (err) {
    console.warn(`  WARNING: could not embed webfonts (${err.message}).`);
    console.warn('  The demo will fall back to system faces — brand typography will differ.');
  }
} else {
  console.warn('  WARNING: no Google Fonts @import found; skipping font embedding.');
}

// Replacer FUNCTIONS, not strings: the bundles contain literal `$&` sequences
// (React internals), and `String.replace` would expand those as substitution
// patterns and corrupt the output.
const out = html
  .replace(
    new RegExp(`\\s*<link[^>]*href="[^"]*${cssFile}"[^>]*>`),
    () => `\n    <style>\n${css}\n    </style>`,
  )
  .replace(
    new RegExp(`\\s*<script[^>]*src="[^"]*${jsFile}"[^>]*></script>`),
    () => `\n    <script type="module">\n${js}\n    </script>`,
  );

if (out.includes(cssFile) || out.includes(jsFile)) {
  throw new Error('inlining failed — asset reference still present in output');
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'index.html'), out);
console.log(`  wrote dist-demo/index.html (${(out.length / 1024).toFixed(0)} kB)`);
