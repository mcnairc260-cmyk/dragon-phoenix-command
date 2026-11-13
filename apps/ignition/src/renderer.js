'use strict';
// IGNITION renderer. All Presage SmartSpectra SDK use is in this file (search for "SDK:").
const {
  SmartSpectraSDK, ValidationCode, SmartSpectraErrorCode, breathingMetrics, cardioMetrics,
} = require('@smartspectra/node-sdk/renderer');
const { decodeMetrics } = require('@smartspectra/node-sdk/messages');
const { SignalBook, Heat, SessionStats, paceWave, pacePhase, rateScore, combineSync, SYNC_THRESHOLD } = require('./engine');
const { Flame } = require('./flame');
const { startSim } = require('./sim');

const env = window.ignitionEnv || { apiKey: '', sim: false };
const SIM = env.sim || new URLSearchParams(location.search).has('sim');   // ?sim is for browser tests
const IN_MS = 4000, OUT_MS = 6000, TARGET_RATE = 60000 / (IN_MS + OUT_MS);  // 6 breaths per minute
const KEY_STORE = 'ignition.apiKey', LEDGER_STORE = 'ignition.ledger';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage is optional */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage is optional */ } },
};

// ---------- screens ----------
const screens = ['consent', 'session', 'result', 'ledger'];
function show(name) {
  for (const s of screens) $('screen-' + s).hidden = s !== name;
  document.querySelector('main').scrollTop = 0;
}
function setCamera(on) {
  $('cam-badge').className = 'badge ' + (on ? 'on' : 'off');
  $('cam-text').textContent = on ? (SIM ? 'SIMULATION RUNNING' : 'CAMERA ON') : 'CAMERA OFF';
  $('btn-stop').hidden = !on;
}
function showError(text, detail) {
  $('error-text').textContent = text;
  $('error-detail').textContent = detail || '';
  $('error').hidden = false;
}
const fmt = (v, d = 0) => (v == null || !isFinite(v) ? '-' : v.toFixed(d));
const clock = (sec) => { const s = Math.max(0, Math.ceil(sec)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// ---------- session state ----------
let sdk = null, stopSim = null, book = null, heat = null, stats = null, flame = null;
let phase = 'idle';            // idle | settle | kindle | done
let phaseLeft = 0, kindleSec = 180, settleSec = 30, paceStart = 0, lastFrame = 0, lastSample = 0, lastSync = 0;
let sync = null, useCardio = true, cardioRetried = false, validationOk = false, lastResult = null, rafId = 0;

const HINTS = {
  [ValidationCode.kNoFaceFound]: 'No face found. Sit in front of the camera.',
  [ValidationCode.kMultipleFacesFound]: 'More than one face is in view. Only one person, please.',
  [ValidationCode.kFaceNotCentered]: 'Move to the center of the picture.',
  [ValidationCode.kFaceSizeOutOfRange]: 'Change your distance from the camera.',
  [ValidationCode.kTooDark]: 'Too dark. Add light in front of you.',
  [ValidationCode.kTooBright]: 'Too bright. Reduce the light on your face.',
  [ValidationCode.kChestNotVisible]: 'The camera must see your chest. Sit back a little.',
  [ValidationCode.kCameraTuning]: 'The camera is adjusting. Hold still.',
  [ValidationCode.kFrameRateTooLow]: 'The camera is slow. Close other apps that use video.',
  [ValidationCode.kExcessiveMotion]: 'Too much movement. Sit still.',
  [ValidationCode.kFaceTooClose]: 'Too close. Sit back.',
  [ValidationCode.kFaceTooFar]: 'Too far. Move nearer.',
  [ValidationCode.kFaceTooHigh]: 'Lower your face in the picture.',
  [ValidationCode.kFaceTooLow]: 'Raise your face in the picture.',
  [ValidationCode.kFaceNotForward]: 'Look toward the screen.',
};
function setHint(text, cls) { const h = $('hint'); h.textContent = text; h.className = 'hint' + (cls ? ' ' + cls : ''); }

function onMetrics(m) { if (book) book.ingest(m, performance.now()); }

// SDK: build one SmartSpectra session. Telemetry is off unless the person turned it on.
function buildSdk(apiKey, telemetry) {
  sdk = new SmartSpectraSDK({
    apiKey,
    requestedMetrics: useCardio ? [...breathingMetrics, ...cardioMetrics] : [...breathingMetrics],
    enableTelemetry: telemetry,
  });
  // SDK: the camera stream the SDK opened. Shown as a small mirror so the person sees what the camera sees.
  sdk.on('streamAvailable', (stream) => { $('preview').srcObject = stream; $('preview').play().catch(() => {}); });
  // SDK: live metrics (breathing trace, breathing rate, pulse rate, HRV) as a protobuf buffer.
  sdk.on('metrics', (buf) => { try { onMetrics(decodeMetrics(buf)); } catch (e) { console.error('metrics decode failed', e); } });
  // SDK: picture-quality feedback. Turned into plain instructions.
  sdk.on('validationStatus', (code, ts, hint) => {
    validationOk = code === ValidationCode.kOk;
    if (validationOk) setHint('Signal is good.', 'ok');
    else setHint(HINTS[code] || hint || 'Adjust your position.', 'warn');
  });
  sdk.on('error', (code, message) => onSdkError(code, message));
}

async function onSdkError(code, message) {
  console.error('SmartSpectra error', code, message);
  if (phase === 'idle' || phase === 'done') return;
  const cardioBlocked = code === SmartSpectraErrorCode.kMetricNotAuthorized || /device keys/i.test(message || '');
  if (useCardio && !cardioRetried && cardioBlocked) {
    // The key is not enabled for pulse/HRV. Run again on breathing only.
    cardioRetried = true; useCardio = false;
    $('cardio-note').hidden = false;
    await teardown();
    return startCapture();
  }
  const text = {
    [SmartSpectraErrorCode.kAuthenticationFailed]: 'Presage did not accept the API key. Check the key and try again.',
    [SmartSpectraErrorCode.kCreditExhausted]: 'The Presage account has no credits left.',
    [SmartSpectraErrorCode.kNetworkError]: 'The SDK could not reach Presage to check the API key. Check the internet connection.',
    [SmartSpectraErrorCode.kServerError]: 'The Presage server gave an error. Try again in a minute.',
    [SmartSpectraErrorCode.kInputUnavailable]: 'No camera is available. Connect a camera and allow camera access.',
    [SmartSpectraErrorCode.kSustainedLowFrameRate]: 'The camera frame rate stayed too low for a reading.',
  }[code] || 'The measurement stopped.';
  await endSession(false);
  showError(text, `SmartSpectra code ${code}: ${message || ''}`);
}

let currentKey = '', currentTelemetry = false;
async function startCapture() {
  if (SIM) { stopSim = startSim(onMetrics, () => (phase === 'kindle' ? { startMs: paceStart, inMs: IN_MS, outMs: OUT_MS } : null)); validationOk = true; setHint('Simulated signal.', 'warn'); return; }
  buildSdk(currentKey, currentTelemetry);
  await sdk.start();   // SDK: opens the camera and starts on-device processing
}

// SDK: stop processing, release the camera, destroy the session.
async function teardown() {
  if (stopSim) { stopSim(); stopSim = null; }
  const s = sdk; sdk = null;
  if (s) {
    try { await s.stop(); } catch (e) { console.error('stop failed', e); }
    try { s.destroy(); } catch { /* already destroyed */ }
  }
  const v = $('preview');
  if (v.srcObject) { for (const t of v.srcObject.getTracks()) t.stop(); v.srcObject = null; }
}

async function begin() {
  currentKey = (env.apiKey || $('api-key').value).trim();
  currentTelemetry = $('opt-telemetry').checked;
  if (!SIM && !currentKey) { $('consent-note').textContent = 'A Presage API key is necessary. Get one at physiology.presagetech.com.'; return; }
  if ($('remember-key').checked && !env.apiKey) store.set(KEY_STORE, currentKey);
  kindleSec = Number(document.querySelector('input[name=len]:checked').value);
  settleSec = kindleSec >= 180 ? 30 : 15;
  book = new SignalBook(); heat = new Heat(kindleSec * 0.5); stats = new SessionStats();
  useCardio = true; cardioRetried = false; sync = null; validationOk = false;
  $('cardio-note').hidden = true;
  phase = 'settle'; phaseLeft = settleSec;
  show('session'); setCamera(true); setHint('Starting the camera...');
  if (!flame) flame = new Flame($('stage'));
  lastFrame = performance.now();
  cancelAnimationFrame(rafId); rafId = requestAnimationFrame(tick);
  try { await startCapture(); }
  catch (e) { onSdkError(e && e.code, e && e.message); }
}

function toKindle() {
  phase = 'kindle'; phaseLeft = kindleSec; paceStart = performance.now();
  $('btn-skip').textContent = 'End the session now';
}

async function endSession(showResult) {
  const wasKindle = phase === 'kindle';
  phase = 'done';
  cancelAnimationFrame(rafId);
  await teardown();
  setCamera(false);
  $('btn-skip').textContent = 'Skip to the next step';
  if (!showResult || !wasKindle) { show('consent'); phase = 'idle'; return; }
  const s = stats.summary();
  lastResult = {
    at: new Date().toISOString(), seconds: Math.round(kindleSec - Math.max(0, phaseLeft)),
    before: s.before, after: s.after, syncSeconds: Math.round(heat.syncSeconds), fire: Math.round(heat.value * 100), simulated: SIM,
  };
  renderResult(lastResult);
  show('result');
}

function renderResult(r) {
  $('result-title').textContent = r.fire >= 60 ? 'The fire is lit.' : 'The fire is started.';
  $('result-lede').textContent = `You held the slow pace for ${clock(r.syncSeconds)} of ${clock(r.seconds)}. The fire reached ${r.fire} percent. It grew only while your measured breath followed the pace.` + (r.simulated ? ' (Simulated signal, not a real reading.)' : '');
  $('r-br-a').textContent = fmt(r.before.br); $('r-br-b').textContent = fmt(r.after.br);
  $('r-pulse-a').textContent = fmt(r.before.pulse); $('r-pulse-b').textContent = fmt(r.after.pulse);
  $('r-hrv-a').textContent = fmt(r.before.rmssd); $('r-hrv-b').textContent = fmt(r.after.rmssd);
  $('r-sync').textContent = clock(r.syncSeconds);
  $('action').value = ''; $('btn-save').disabled = false;
  $('save-note').textContent = 'Nothing from this session is saved until you press Save.';
  resetContract();
}

// ---------- the frame loop ----------
function tick(now) {
  rafId = requestAnimationFrame(tick);
  const dt = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now;
  if (phase !== 'settle' && phase !== 'kindle') return;
  const live = book.fresh(now) && book.rate != null;
  const level = book.fresh(now) ? book.level(now) : null;

  if (phase === 'settle') {
    if (live) phaseLeft -= dt;       // the baseline counts only while the SDK gives readings
    $('cue-main').textContent = live ? 'Sit still. Breathe as you usually do.' : 'Looking for your breath...';
    $('cue-sub').textContent = live ? 'Reading your starting point' : 'Face the camera. Keep your chest in view.';
    if (phaseLeft <= 0) toKindle();
  } else {
    phaseLeft -= dt;
    if (now - lastSync > 500) {
      lastSync = now;
      const rs = book.rate && now - book.rate.at < 6000 ? rateScore(book.rate.value, TARGET_RATE) : null;
      sync = book.fresh(now) ? combineSync(book.sync(now, paceStart, IN_MS, OUT_MS), rs) : null;
    }
    heat.update(dt, sync);
    const ph = pacePhase(now - paceStart, IN_MS, OUT_MS);
    $('cue-main').textContent = ph.inhale ? 'Breathe in' : 'Breathe out';
    $('cue-sub').textContent = sync == null ? 'Follow the dashed ring' : sync >= SYNC_THRESHOLD ? 'In sync. The fire grows.' : 'Match the blue ring to the dashed ring';
    if (phaseLeft <= 0) { endSession(true); return; }
  }

  if (now - lastSample > 1000) {
    lastSample = now;
    if (phase === 'settle') stats.sample('before', book, now);
    else if (phaseLeft <= Math.min(45, kindleSec / 2)) stats.sample('after', book, now);
    $('v-br').textContent = fmt(book.rate && book.rate.value, 1);
    $('v-pulse').textContent = fmt(book.pulse && book.pulse.value);
    $('v-hrv').textContent = fmt(book.hrv && book.hrv.rmssd);
    $('phase-name').textContent = phase === 'settle' ? 'SETTLE' : 'KINDLE';
    $('sync-val').textContent = sync == null ? '-' : Math.round(sync * 100) + '%';
    $('sync-bar').style.width = (sync == null ? 0 : Math.round(sync * 100)) + '%';
    $('heat-bar').style.width = Math.round(heat.value * 100) + '%';
  }
  $('phase-time').textContent = clock(phaseLeft);
  flame.frame(dt, {
    heat: phase === 'kindle' ? heat.value : 0.04,
    breath: level,
    pace: phase === 'kindle' ? paceWave(now - paceStart, IN_MS, OUT_MS) : null,
    pulse: book.pulse && now - book.pulse.at < 6000 ? book.pulse.value : null,
  });
}

// ---------- 10-minute contract (camera is off) ----------
let contractId = 0;
function resetContract() {
  clearInterval(contractId);
  $('contract-clock').hidden = true; $('btn-contract').disabled = false;
  $('contract-note').textContent = 'Ten minutes on that one action. The camera stays off. When the time ends, you decide to continue or to stop.';
}
function startContract() {
  const end = Date.now() + 600000;
  $('btn-contract').disabled = true; $('contract-clock').hidden = false;
  const what = $('action').value.trim();
  $('contract-note').textContent = what ? 'Go: ' + what : 'Go. Do the first small action now.';
  const step = () => {
    const left = (end - Date.now()) / 1000;
    $('contract-clock').textContent = clock(left);
    if (left <= 0) { clearInterval(contractId); $('contract-note').textContent = 'Ten minutes are complete. Continue or stop. It is your decision.'; }
  };
  step(); contractId = setInterval(step, 500);
}

// ---------- local ledger ----------
function renderLedger() {
  const list = $('ledger-list'); list.textContent = '';
  const rows = store.get(LEDGER_STORE, []);
  if (!rows.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'No saved sessions.'; list.append(p); }
  rows.forEach((r, i) => {
    const row = document.createElement('div'); row.className = 'lrow';
    const left = document.createElement('div');
    const when = document.createElement('div'); when.className = 'when'; when.textContent = new Date(r.at).toLocaleString() + (r.simulated ? '  (simulated)' : '');
    const what = document.createElement('div'); what.className = 'what';
    what.textContent = `Breaths ${fmt(r.before.br)} to ${fmt(r.after.br)}  |  Pulse ${fmt(r.before.pulse)} to ${fmt(r.after.pulse)}  |  HRV ${fmt(r.before.rmssd)} to ${fmt(r.after.rmssd)}  |  Fire ${r.fire}%`;
    left.append(when, what);
    if (r.action) { const a = document.createElement('div'); a.className = 'act'; a.textContent = 'First action: ' + r.action; left.append(a); }
    const del = document.createElement('button'); del.className = 'btn danger small'; del.textContent = 'Delete';
    del.addEventListener('click', () => { const all = store.get(LEDGER_STORE, []); all.splice(i, 1); store.set(LEDGER_STORE, all); renderLedger(); });
    row.append(left, del); list.append(row);
  });
  $('btn-forget').hidden = store.get(KEY_STORE, '') === '';
}

// ---------- wiring ----------
function refreshBegin() { $('btn-begin').disabled = !$('opt-consent').checked; }
$('opt-consent').addEventListener('change', refreshBegin);
$('btn-begin').addEventListener('click', begin);
$('btn-stop').addEventListener('click', () => endSession(false));
$('btn-skip').addEventListener('click', () => { if (phase === 'settle') toKindle(); else if (phase === 'kindle') endSession(true); });
$('btn-contract').addEventListener('click', startContract);
$('btn-save').addEventListener('click', () => {
  if (!lastResult) return;
  const rows = store.get(LEDGER_STORE, []);
  rows.unshift({ ...lastResult, action: $('action').value.trim() });
  store.set(LEDGER_STORE, rows.slice(0, 200));
  $('btn-save').disabled = true; $('save-note').textContent = 'Saved on this computer. See and delete it in My saved sessions.';
});
$('btn-done').addEventListener('click', () => { lastResult = null; resetContract(); $('opt-consent').checked = false; refreshBegin(); phase = 'idle'; show('consent'); });
$('btn-ledger').addEventListener('click', () => { renderLedger(); show('ledger'); });
$('btn-back').addEventListener('click', () => show('consent'));
$('btn-wipe').addEventListener('click', () => { store.del(LEDGER_STORE); renderLedger(); });
$('btn-forget').addEventListener('click', () => { store.del(KEY_STORE); $('api-key').value = ''; renderLedger(); });
$('btn-error-ok').addEventListener('click', () => { $('error').hidden = true; });
window.addEventListener('beforeunload', () => { if (sdk) { try { sdk.destroy(); } catch { /* already destroyed */ } } });

$('sim-badge').hidden = !SIM;
$('preview').hidden = SIM;
if (env.apiKey || SIM) { $('key-row').hidden = true; $('remember-row').hidden = true; $('consent-note').textContent = SIM ? 'Simulation mode: no camera and no Presage data are used.' : 'API key read from the SMARTSPECTRA_API_KEY environment variable.'; }
else { const k = store.get(KEY_STORE, ''); if (k) { $('api-key').value = k; $('remember-key').checked = true; } }
setCamera(false); show('consent');
