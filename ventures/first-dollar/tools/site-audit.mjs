#!/usr/bin/env node
// Check one or more business websites. Reads ONE page per site (the home page).
//
//   node tools/site-audit.mjs https://example-plumber.com
//   node tools/site-audit.mjs --json https://a.com https://b.com
//   node tools/site-audit.mjs --file saved-page.html --url https://a.com
//
// Needs Node 18 or newer. No install step.

import { readFile } from 'node:fs/promises';
import { auditHtml, renderReport } from './lib/audit.mjs';

const UA = 'Mozilla/5.0 (compatible; site-check/1.0)';

export async function fetchPage(url, { timeoutMs = 15000 } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const html = await res.text();
    return { html, meta: { requestedUrl: url, finalUrl: res.url || url, status: res.status, ms: Date.now() - started } };
  } catch (err) {
    const cause = err?.cause?.code || err?.cause?.message || err?.name || 'network error';
    return { html: '', meta: { requestedUrl: url, status: null, error: String(cause), ms: Date.now() - started } };
  }
}

/** Accepts "example.com" or a full URL. Tries https first, then http. */
export async function auditUrl(input) {
  const hasScheme = /^https?:\/\//i.test(input);
  const first = hasScheme ? input : `https://${input}`;
  let page = await fetchPage(first);
  if (!hasScheme && (page.meta.error || page.meta.status == null)) {
    const second = await fetchPage(`http://${input}`);
    if (!second.meta.error) page = second;
  }
  return auditHtml(page.html, page.meta);
}

async function main(argv) {
  const json = argv.includes('--json');
  const fileIdx = argv.indexOf('--file');
  const urlIdx = argv.indexOf('--url');
  const results = [];

  if (fileIdx !== -1) {
    const html = await readFile(argv[fileIdx + 1], 'utf8');
    const url = urlIdx !== -1 ? argv[urlIdx + 1] : 'https://local.file/';
    results.push(auditHtml(html, { requestedUrl: url, finalUrl: url, status: 200, ms: 0 }));
  } else {
    const urls = argv.filter((a) => !a.startsWith('--'));
    if (!urls.length) {
      console.error('Give at least one web address. Example: node tools/site-audit.mjs example.com');
      process.exit(2);
    }
    for (const u of urls) results.push(await auditUrl(u));
  }

  if (json) console.log(JSON.stringify(results, null, 2));
  else console.log(results.map((r) => renderReport(r)).join('\n\n' + '-'.repeat(60) + '\n\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
}
