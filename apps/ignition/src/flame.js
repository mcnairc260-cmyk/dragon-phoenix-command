'use strict';
// Canvas drawing: the fire, the pace ring and the live breath ring. Colors come from CSS variables.

function cssRgb(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace('#', '');
  const n = parseInt(v.length === 3 ? v.replace(/./g, '$&$&') : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));

class Flame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ember = cssRgb('--ember'); this.gold = cssRgb('--gold'); this.cyan = cssRgb('--cyan'); this.ash = cssRgb('--ash');
    this.parts = [];
    this.beat = 0;
    this.breath = 0.5;
    this.still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const d = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * d); this.canvas.height = Math.round(this.h * d);
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  // s: { heat 0..1, breath 0..1|null, pace 0..1|null, pulse bpm|null, flare 0..1 }
  frame(dt, s) {
    const { ctx, w, h } = this;
    const cx = w / 2, cy = h * 0.56, unit = Math.min(w, h);
    const r0 = unit * 0.16, span = unit * 0.2;
    if (s.breath != null) this.breath += (s.breath - this.breath) * Math.min(1, dt * 8);
    const breath = s.breath == null ? 0.5 : this.breath;
    const heat = Math.max(s.heat, s.flare || 0);

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    // Core glow. It beats at the measured pulse rate when the SDK gives one.
    if (s.pulse) this.beat = (this.beat + dt * s.pulse / 60) % 1;
    const thump = s.pulse ? Math.exp(-5 * this.beat) : 0;
    const gr = r0 * (0.55 + 0.9 * heat + 0.12 * thump);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr * 2.2);
    g.addColorStop(0, rgba(this.gold, 0.16 + 0.5 * heat + 0.12 * thump));
    g.addColorStop(0.4, rgba(this.ember, 0.1 + 0.3 * heat));
    g.addColorStop(1, rgba(this.ember, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, gr * 2.2, 0, Math.PI * 2); ctx.fill();

    // Fire particles. The count and the lift follow the heat and the live breath level.
    ctx.globalCompositeOperation = 'lighter';
    if (!this.still) {
      const spawn = (3 + heat * 30) * (0.5 + breath) * dt * 60;
      for (let i = 0; i < spawn && this.parts.length < 900; i++) {
        const life = 0.5 + Math.random() * (0.6 + heat * 0.9);
        this.parts.push({
          x: cx + (Math.random() - 0.5) * r0 * (0.45 + 0.55 * heat), y: cy + r0 * 0.3,
          vx: (Math.random() - 0.5) * 26, vy: -(50 + heat * unit * 0.62) * (0.6 + 0.7 * breath) * (0.6 + Math.random() * 0.6),
          life, age: 0, size: unit * (0.016 + 0.022 * heat) * (0.6 + Math.random()),
        });
      }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.age += dt;
      if (p.age >= p.life) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt + Math.sin((p.age + i) * 5) * 8 * dt + (cx - p.x) * 1.4 * dt; p.y += p.vy * dt;
      const t = p.age / p.life;
      const c = mix(this.gold, this.ember, Math.min(1, t * 1.4));
      const rad = p.size * (1 - 0.6 * t);
      const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      pg.addColorStop(0, rgba(c, 0.2 * (1 - t)));
      pg.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // The pace ring (dashed) and the live breath ring (solid). Match them.
    if (s.pace != null) {
      ctx.setLineDash([6, 8]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(this.gold, 0.75);
      ctx.beginPath(); ctx.arc(cx, cy, r0 + span * s.pace, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (s.breath != null) {
      ctx.lineWidth = 3; ctx.strokeStyle = rgba(this.cyan, 0.9);
      ctx.shadowColor = rgba(this.cyan, 0.6); ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(cx, cy, r0 + span * breath, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.lineWidth = 1; ctx.strokeStyle = rgba(this.ash, 0.15);
      ctx.beginPath(); ctx.arc(cx, cy, r0 + span * 0.5, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

module.exports = { Flame };
