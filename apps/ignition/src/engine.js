'use strict';
// Pure signal logic. No DOM, no SDK. Runs in Node for tests (test/engine.test.js).

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// SDK timestamps are microseconds and can arrive as number, bigint or Long.
function tsNum(ts) {
  if (ts == null) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'bigint') return Number(ts);
  if (typeof ts.toNumber === 'function') return ts.toNumber();
  return Number(ts);
}

// The pacer: 0 (empty) to 1 (full). Rises during the inhale, falls during the exhale.
function paceWave(tMs, inMs, outMs) {
  const T = inMs + outMs;
  const p = ((tMs % T) + T) % T;
  if (p < inMs) return 0.5 - 0.5 * Math.cos(Math.PI * p / inMs);
  return 0.5 + 0.5 * Math.cos(Math.PI * (p - inMs) / outMs);
}

function pacePhase(tMs, inMs, outMs) {
  const T = inMs + outMs;
  const p = ((tMs % T) + T) % T;
  return p < inMs ? { inhale: true, leftMs: inMs - p } : { inhale: false, leftMs: T - p };
}

function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return 0;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (sxx < 1e-12 || syy < 1e-12) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

const TRACE_KEEP_MS = 30000;
const LEVEL_WINDOW_MS = 12000;
const SYNC_WINDOW_MS = 20000;
const SYNC_MIN_SPAN_MS = 10000;

// Holds the newest decoded SmartSpectra metrics in a form the UI can read each frame.
class SignalBook {
  constructor() {
    this.trace = [];        // chest breathing trace: { t: SDK ms, v }
    this.offset = 0;        // local clock ms minus SDK ms, from the newest packet
    this.rate = null;       // { value, confidence, stable, at }
    this.pulse = null;
    this.hrv = null;        // { rmssd, sdnn, confidence, stable, at }
    this.lastPacketAt = -Infinity;
  }

  ingest(m, nowMs) {
    if (!m) return;
    this.lastPacketAt = nowMs;
    const up = (m.breathing && m.breathing.upperTrace) || [];
    if (up.length) {
      const newest = tsNum(up[up.length - 1].timestamp) / 1000;
      this.offset = newest ? nowMs - newest : 0;
      for (const s of up) {
        if (typeof s.value !== 'number' || !isFinite(s.value)) continue;
        const t = tsNum(s.timestamp) / 1000;
        this.trace.push({ t: t || nowMs, v: s.value });
      }
      const cut = nowMs - this.offset - TRACE_KEEP_MS;
      let i = 0;
      while (i < this.trace.length && this.trace[i].t < cut) i++;
      if (i) this.trace.splice(0, i);
    }
    const last = (arr) => (arr && arr.length ? arr[arr.length - 1] : null);
    const r = last(m.breathing && m.breathing.rate);
    if (r && r.value > 0) this.rate = { value: r.value, confidence: r.confidence, stable: !!r.stable, at: nowMs };
    const p = last(m.cardio && m.cardio.pulseRate);
    if (p && p.value > 0) this.pulse = { value: p.value, confidence: p.confidence, stable: !!p.stable, at: nowMs };
    const h = last(m.cardio && m.cardio.hrv);
    if (h && h.rmssd > 0) this.hrv = { rmssd: h.rmssd, sdnn: h.sdnn, confidence: h.confidence, stable: !!h.stable, at: nowMs };
  }

  fresh(nowMs, maxAgeMs = 4000) { return nowMs - this.lastPacketAt < maxAgeMs; }

  _window(nowMs, spanMs) {
    const cut = nowMs - this.offset - spanMs;
    const out = [];
    for (let i = this.trace.length - 1; i >= 0 && this.trace[i].t >= cut; i--) out.push(this.trace[i]);
    return out.reverse();
  }

  // Where the chest is now, 0 (out) to 1 (in), scaled to the person's own recent range.
  level(nowMs) {
    const w = this._window(nowMs, LEVEL_WINDOW_MS);
    if (w.length < 20) return null;
    let lo = Infinity, hi = -Infinity;
    for (const s of w) { if (s.v < lo) lo = s.v; if (s.v > hi) hi = s.v; }
    if (hi - lo < 1e-9) return null;
    const n = Math.min(3, w.length);
    let v = 0;
    for (let i = w.length - n; i < w.length; i++) v += w[i].v;
    return clamp((v / n - lo) / (hi - lo), 0, 1);
  }

  // How well the measured breath follows the pacer rhythm, 0 to 1.
  // The best lag in a +/-3 s range is used, because the SDK output has some delay
  // and the sign of the trace is not assumed.
  sync(nowMs, paceStartMs, inMs, outMs) {
    const w = this._window(nowMs, SYNC_WINDOW_MS);
    if (w.length < 30 || w[w.length - 1].t - w[0].t < SYNC_MIN_SPAN_MS) return null;
    const xs = w.map((s) => s.v);
    let best = 0;
    for (let lag = -3000; lag <= 3000; lag += 200) {
      const ys = w.map((s) => paceWave(s.t + this.offset + lag - paceStartMs, inMs, outMs));
      const r = Math.abs(pearson(xs, ys));
      if (r > best) best = r;
    }
    return best;
  }
}

function rateScore(rate, target) {
  if (!(rate > 0)) return null;
  return clamp(1 - Math.abs(rate - target) / target, 0, 1);
}

// One number for "is this person breathing with the pacer", from both live signals.
function combineSync(traceSync, rScore) {
  if (traceSync == null && rScore == null) return null;
  if (traceSync == null) return rScore;
  if (rScore == null) return traceSync;
  return 0.5 * traceSync + 0.5 * rScore;
}

const SYNC_THRESHOLD = 0.55;

// The fire. It grows only while the measured breath follows the pacer. It cools slowly if not.
class Heat {
  constructor(fullSeconds) { this.value = 0; this.fullSeconds = fullSeconds; this.syncSeconds = 0; }
  update(dtSec, sync) {
    if (sync != null && sync >= SYNC_THRESHOLD) {
      this.value += dtSec * sync / this.fullSeconds;
      this.syncSeconds += dtSec;
    } else {
      this.value -= dtSec / (this.fullSeconds * 3);
    }
    this.value = clamp(this.value, 0, 1);
    return this.value;
  }
}

// Before / after readings for one session. Medians, so one bad sample does not move the result.
class SessionStats {
  constructor() { this.before = { br: [], pulse: [], rmssd: [] }; this.after = { br: [], pulse: [], rmssd: [] }; }
  sample(bucket, book, nowMs) {
    const b = this[bucket];
    if (book.rate && nowMs - book.rate.at < 5000) b.br.push(book.rate.value);
    if (book.pulse && nowMs - book.pulse.at < 5000) b.pulse.push(book.pulse.value);
    if (book.hrv && nowMs - book.hrv.at < 15000) b.rmssd.push(book.hrv.rmssd);
  }
  resetAfter() { this.after = { br: [], pulse: [], rmssd: [] }; }
  summary() {
    const f = (b) => ({ br: median(b.br), pulse: median(b.pulse), rmssd: median(b.rmssd) });
    return { before: f(this.before), after: f(this.after) };
  }
}

module.exports = { clamp, tsNum, paceWave, pacePhase, median, pearson, SignalBook, rateScore, combineSync, Heat, SessionStats, SYNC_THRESHOLD };
