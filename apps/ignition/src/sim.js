'use strict';
// SIMULATION ONLY. Makes fake numbers in the same shape as decoded SmartSpectra metrics,
// so the screens can be developed and tested on a machine with no camera or API key.
// It is never Presage data, and the app shows a "SIMULATED" banner while it runs.
const { paceWave } = require('./engine');

function startSim(onMetrics, getPace) {
  const t0 = performance.now();
  let phase = 0, last = t0, n = 0;
  const id = setInterval(() => {
    const now = performance.now();
    const pace = getPace();          // null until the pacer starts
    const samples = [];
    const follow = pace ? Math.min(1, (now - pace.startMs) / 20000) : 0;
    for (let t = last + 33; t <= now; t += 33) {
      phase += 2 * Math.PI * (14 / 60) * 0.033;
      const free = 0.5 + 0.5 * Math.sin(phase);
      const led = pace ? paceWave(t - 700 - pace.startMs, pace.inMs, pace.outMs) : free;
      const v = (1 - follow) * free + follow * led + (Math.random() - 0.5) * 0.06;
      samples.push({ value: v, stable: true, timestamp: Math.round(t * 1000) });
      last = t;
    }
    const ts = Math.round(now * 1000);
    const m = { breathing: { upperTrace: samples }, cardio: {} };
    if (++n % 10 === 0) {
      m.breathing.rate = [{ value: 14 - 8 * follow + (Math.random() - 0.5) * 0.6, confidence: 0.9, stable: true, timestamp: ts }];
      m.cardio.pulseRate = [{ value: 78 - 7 * follow + (Math.random() - 0.5) * 2, confidence: 0.9, stable: true, timestamp: ts }];
    }
    if (n % 50 === 0) m.cardio.hrv = [{ rmssd: 30 + 16 * follow + Math.random() * 3, sdnn: 40, confidence: 0.8, stable: true, timestamp: ts }];
    onMetrics(m);
  }, 100);
  return () => clearInterval(id);
}

module.exports = { startSim };
