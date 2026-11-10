import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditHtml, renderReport } from '../lib/audit.mjs';

const fx = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const ids = (r, status) => r.findings.filter((f) => f.status === status).map((f) => f.id);
const meta = (url) => ({ requestedUrl: url, finalUrl: url, status: 200, ms: 120, currentYear: 2026 });

test('weak site: every planted problem is found', async () => {
  const r = auditHtml(await fx('weak-site.html'), meta('http://smith-plumbing.test/'));
  const fails = ids(r, 'fail');
  for (const id of ['https', 'mobile', 'tap-to-call', 'request-form', 'title', 'fresh', 'placeholder']) {
    assert.ok(fails.includes(id), `expected fail: ${id}`);
  }
  assert.equal(r.vendor.id, 'hibu');
  assert.equal(r.vendor.rented, true);
  assert.match(r.ownerPoints.join(' '), /2017/);
  assert.match(r.ownerPoints.join(' '), /cannot tap it to call/);
});

test('phone in text without tel: link is a different message from no phone at all', () => {
  const a = auditHtml('<html><title>Abc Roofing Hoover</title><body>Call 205-555-0100</body></html>', meta('https://a.test/'));
  const b = auditHtml('<html><title>Abc Roofing Hoover</title><body>Hello</body></html>', meta('https://a.test/'));
  assert.match(a.findings.find((f) => f.id === 'tap-to-call').label, /cannot be tapped/);
  assert.match(b.findings.find((f) => f.id === 'tap-to-call').label, /No phone number/);
});

test('pdf menu and restaurant vendor are detected, good parts pass', async () => {
  const r = auditHtml(await fx('pdf-menu.html'), meta('https://fictional-smokehouse.test/'));
  assert.ok(ids(r, 'warn').includes('pdf-only'));
  assert.equal(r.vendor.id, 'popmenu');
  for (const id of ['https', 'mobile', 'tap-to-call', 'title', 'description', 'fresh']) {
    assert.ok(ids(r, 'pass').includes(id), `expected pass: ${id}`);
  }
});

test('facebook-only presence is reported as no owned website and nothing else', () => {
  const r = auditHtml('', { requestedUrl: 'https://www.facebook.com/somebiz', status: 200 });
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].id, 'owned-site');
  assert.equal(r.fails, 1);
});

test('site that does not load is one clear failure, with the reason', () => {
  const r = auditHtml('', { requestedUrl: 'https://gone.test/', status: null, error: 'ENOTFOUND' });
  assert.deepEqual(ids(r, 'fail'), ['loads']);
  assert.match(r.ownerPoints[0], /ENOTFOUND/);
  const s = auditHtml('<html></html>', { requestedUrl: 'https://gone.test/', status: 503 });
  assert.deepEqual(ids(s, 'fail'), ['loads']);
});

test('copyright year range uses the newest year; a current year passes', () => {
  const html = '<html><meta name="viewport" content="x"><title>Abc Roofing Hoover AL</title><body><a href="tel:1">c</a><form></form>© 2012-2026 Abc</body></html>';
  const r = auditHtml(html, meta('https://a.test/'));
  assert.ok(ids(r, 'pass').includes('fresh'));
  const old = auditHtml(html.replace('2012-2026', '2012 - 2019'), meta('https://a.test/'));
  assert.ok(ids(old, 'fail').includes('fresh'));
});

test('no vendor is reported when no signature is present', () => {
  const r = auditHtml('<html><title>Abc Roofing Hoover AL</title><body>We do roofs.</body></html>', meta('https://a.test/'));
  assert.equal(r.vendor, null);
});

test('report is plain text with problems first', async () => {
  const r = auditHtml(await fx('weak-site.html'), meta('http://smith-plumbing.test/'));
  const txt = renderReport(r, 'Smith Plumbing');
  assert.match(txt, /WEBSITE CHECK - Smith Plumbing/);
  assert.ok(txt.indexOf('[PROBLEM]') < txt.indexOf('[GOOD]'));
});

test('a plain link to a directory profile is not reported as the site vendor', () => {
  const html = '<html><title>Abc Roofing Hoover AL</title><body><a href="https://www.yellowpages.com/hoover-al/abc">Find us</a> <a href="https://thryv.com/x">t</a></body></html>';
  assert.equal(auditHtml(html, meta('https://a.test/')).vendor, null);
  const credit = html.replace('Find us</a>', 'Find us</a> Site by Thryv');
  assert.equal(auditHtml(credit, meta('https://a.test/')).vendor.id, 'thryv');
});
