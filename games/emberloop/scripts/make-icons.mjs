/**
 * Generates the PWA icon set procedurally — no binary art in the repo, nothing
 * to license. Run with `npm run icons` after changing the design below.
 *
 * The mark is an "ember loop": a glowing ring whose hue sweeps crimson → gold,
 * with a bright ember riding it, over an obsidian field.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

// ── PNG encoding ────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // 10..12 stay zero: deflate compression, adaptive filtering, no interlace.

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0 (none)
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing ─────────────────────────────────────────────────────────────────
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** Sweep crimson → ember → gold around the loop. */
function ringColor(angle) {
  // The brand's signature fire gradient: Ember Orange → Rebirth Gold.
  const stops = [
    [0xff, 0x6b, 0x2c],
    [0xff, 0x8a, 0x36],
    [0xff, 0xb3, 0x00],
    [0xff, 0xd9, 0x6a],
    [0xff, 0x6b, 0x2c],
  ];
  const t = ((angle / (Math.PI * 2)) % 1 + 1) % 1;
  const scaled = t * (stops.length - 1);
  const i = Math.min(Math.floor(scaled), stops.length - 2);
  const f = scaled - i;
  return [
    lerp(stops[i][0], stops[i + 1][0], f),
    lerp(stops[i][1], stops[i + 1][1], f),
    lerp(stops[i][2], stops[i + 1][2], f),
  ];
}

function drawIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const c = size / 2;
  // Maskable icons must keep the mark inside the inner 80% safe zone.
  const scale = maskable ? 0.62 : 0.8;
  const ringRadius = (size / 2) * scale * 0.62;
  const ringWidth = size * scale * 0.075;
  const emberAngle = -Math.PI / 3;
  const emberX = c + Math.cos(emberAngle) * ringRadius;
  const emberY = c + Math.sin(emberAngle) * ringRadius;
  const emberR = ringWidth * 1.05;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Obsidian field with a faint warm centre.
      const centreWarm = 1 - smooth(0, size * 0.55, dist);
      let r = lerp(0x0a, 0x24, centreWarm * 0.9);
      let g = lerp(0x0a, 0x14, centreWarm * 0.9);
      let b = lerp(0x0f, 0x18, centreWarm * 0.9);

      // Outer bloom around the loop.
      const bloom = Math.exp(-Math.pow((dist - ringRadius) / (ringWidth * 2.6), 2));
      const [br, bg, bb] = ringColor(angle);
      r += br * bloom * 0.42;
      g += bg * bloom * 0.42;
      b += bb * bloom * 0.42;

      // The ring itself, feathered on both edges.
      const band = 1 - smooth(ringWidth * 0.34, ringWidth * 0.62, Math.abs(dist - ringRadius));
      r = lerp(r, br, band);
      g = lerp(g, bg, band);
      b = lerp(b, bb, band);

      // The ember riding the loop.
      const emberDist = Math.hypot(x - emberX, y - emberY);
      const ember = 1 - smooth(emberR * 0.35, emberR, emberDist);
      const emberGlow = Math.exp(-Math.pow(emberDist / (emberR * 2.2), 2)) * 0.8;
      r = lerp(r, 255, ember) + 255 * emberGlow * 0.35;
      g = lerp(g, 240, ember) + 200 * emberGlow * 0.35;
      b = lerp(b, 205, ember) + 140 * emberGlow * 0.35;

      const i = (y * size + x) * 4;
      rgba[i] = Math.min(255, Math.round(r));
      rgba[i + 1] = Math.min(255, Math.round(g));
      rgba[i + 2] = Math.min(255, Math.round(b));
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#241418"/>
      <stop offset="100%" stop-color="#0a0a0f"/>
    </radialGradient>
    <linearGradient id="loop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff6b2c"/>
      <stop offset="50%" stop-color="#ff8a36"/>
      <stop offset="100%" stop-color="#ffb300"/>
    </linearGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g filter="url(#glow)">
    <circle cx="256" cy="256" r="128" fill="none" stroke="url(#loop)" stroke-width="30"/>
    <circle cx="320" cy="145" r="30" fill="#f4f4f5"/>
  </g>
</svg>
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'icon.svg'), SVG);

for (const size of [180, 192, 512]) {
  writeFileSync(join(OUT_DIR, `icon-${size}.png`), encodePng(size, size, drawIcon(size)));
}
writeFileSync(join(OUT_DIR, 'icon-maskable-512.png'), encodePng(512, 512, drawIcon(512, { maskable: true })));

console.log(`Wrote icons to ${OUT_DIR}`);
