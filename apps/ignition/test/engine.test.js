'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { paceWave, pacePhase, SignalBook, rateScore, combineSync, Heat, SessionStats, median } = require('../src/engine');

const IN = 4000, OUT = 6000;

// Feed a synthetic chest trace at `perMin` breaths per minute, 30 samples per second.
function feed(book, perMin, seconds, wave) {
  let now = 0;
  for (let t = 0; t < seconds * 1000; t += 100) {
    const s = [];
    for (let k = 0; k < 3; k++) {
      const tt = t + k * 33;
      const v = wave ? wave(tt) : Math.sin(2 * Math.PI * (perMin / 60) * tt / 1000);
      s.push({ value: v, timestamp: (tt + 5000) * 1000 });   // SDK clock is 5 s ahead of local
    }
    now = t + 99;
    book.ingest({ breathing: { upperTrace: s, rate: [{ value: perMin, timestamp: 1 }] } }, now);
  }
  return now;
}

test('paceWave stays in 0..1, is empty at the start and full at the end of the inhale', () => {
  for (let t = -20000; t < 40000; t += 137) {
    const v = paceWave(t, IN, OUT);
    assert.ok(v >= 0 && v <= 1);
  }
  assert.ok(paceWave(0, IN, OUT) < 0.001);
  assert.ok(paceWave(IN, IN, OUT) > 0.999);
  assert.strictEqual(pacePhase(1000, IN, OUT).inhale, true);
  assert.strictEqual(pacePhase(5000, IN, OUT).inhale, false);
});

test('a breath that follows the pacer (with delay and inverted sign) scores high sync', () => {
  const book = new SignalBook();
  const now = feed(book, 6, 40, (t) => -paceWave(t - 900, IN, OUT));
  assert.ok(book.sync(now, 0, IN, OUT) > 0.9);
});

test('a fast 15-per-minute breath scores low sync', () => {
  const book = new SignalBook();
  const now = feed(book, 15, 40);
  assert.ok(book.sync(now, 0, IN, OUT) < 0.4);
});

test('sync needs 10 s of trace, level needs a moving trace', () => {
  const book = new SignalBook();
  assert.strictEqual(book.sync(0, 0, IN, OUT), null);
  assert.strictEqual(book.level(0), null);
  const now = feed(book, 6, 5);
  assert.strictEqual(book.sync(now, 0, IN, OUT), null);
  const l = book.level(now);
  assert.ok(l >= 0 && l <= 1);
  const flat = new SignalBook();
  const n2 = feed(flat, 6, 5, () => 0.3);
  assert.strictEqual(flat.level(n2), null);
});

test('old trace samples are dropped', () => {
  const book = new SignalBook();
  feed(book, 6, 90);
  assert.ok(book.trace.length <= 31 * 30);
});

test('rateScore and combineSync', () => {
  assert.strictEqual(rateScore(6, 6), 1);
  assert.strictEqual(rateScore(12, 6), 0);
  assert.strictEqual(rateScore(0, 6), null);
  assert.strictEqual(combineSync(null, null), null);
  assert.strictEqual(combineSync(0.8, null), 0.8);
  assert.strictEqual(combineSync(1, 0.5), 0.75);
});

test('heat grows only in sync and cools slowly out of sync', () => {
  const h = new Heat(90);
  for (let i = 0; i < 900; i++) h.update(0.1, 1);
  assert.ok(h.value > 0.99);
  assert.ok(Math.abs(h.syncSeconds - 90) < 0.01);
  for (let i = 0; i < 100; i++) h.update(0.1, 0.2);
  assert.ok(h.value < 1 && h.value > 0.9);
  const cold = new Heat(90);
  for (let i = 0; i < 100; i++) cold.update(0.1, null);
  assert.strictEqual(cold.value, 0);
});

test('session stats use medians and ignore stale readings', () => {
  const st = new SessionStats();
  const book = new SignalBook();
  for (const v of [14, 15, 40]) { book.ingest({ breathing: { rate: [{ value: v }] } }, 1000); st.sample('before', book, 1000); }
  st.sample('after', book, 60000);    // rate reading is now 59 s old
  const s = st.summary();
  assert.strictEqual(s.before.br, 15);
  assert.strictEqual(s.after.br, null);
  assert.strictEqual(s.before.pulse, null);
  assert.strictEqual(median([]), null);
});
