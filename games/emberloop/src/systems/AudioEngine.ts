import { AUDIO } from '../config/GameConfig';
import { clamp } from '../core/math';

/**
 * Fully procedural audio — no asset files, no licensing questions.
 *
 * Everything is synthesised with oscillators plus a shared noise buffer. The
 * AudioContext is only created on the first user gesture (`unlock()`), which is
 * what mobile browsers require before any sound may play.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicNodes: AudioNode[] = [];
  private musicRunning = false;

  soundEnabled = true;
  musicEnabled = true;

  /** Create/resume the context. Must be called from inside a user gesture. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = AUDIO.masterVolume;
      this.master.connect(this.ctx.destination);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = AUDIO.sfxVolume;
      this.sfxBus.connect(this.master);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);

      this.noiseBuffer = this.createNoiseBuffer(2);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setSoundEnabled(on: boolean): void {
    this.soundEnabled = on;
    if (this.sfxBus && this.ctx) this.sfxBus.gain.setTargetAtTime(on ? AUDIO.sfxVolume : 0, this.ctx.currentTime, 0.05);
  }

  setMusicEnabled(on: boolean): void {
    this.musicEnabled = on;
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setTargetAtTime(on && this.musicRunning ? AUDIO.musicVolume : 0, this.ctx.currentTime, 0.4);
    }
  }

  private createNoiseBuffer(seconds: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /** One-shot oscillator voice with an exponential decay envelope. */
  private tone(opts: {
    type?: OscillatorType;
    freq: number;
    endFreq?: number;
    duration: number;
    gain?: number;
    delay?: number;
    attack?: number;
    detune?: number;
  }): void {
    if (!this.ctx || !this.sfxBus || !this.soundEnabled) return;
    const t0 = this.now() + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.endFreq), t0 + opts.duration);
    }
    if (opts.detune) osc.detune.setValueAtTime(opts.detune, t0);

    const peak = opts.gain ?? 0.3;
    const attack = opts.attack ?? 0.006;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);

    osc.connect(env).connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.05);
  }

  /** Filtered noise burst — used for impacts, explosions and whooshes. */
  private noise(opts: {
    duration: number;
    gain?: number;
    delay?: number;
    filter?: BiquadFilterType;
    freq?: number;
    endFreq?: number;
    q?: number;
  }): void {
    if (!this.ctx || !this.sfxBus || !this.noiseBuffer || !this.soundEnabled) return;
    const t0 = this.now() + (opts.delay ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = opts.filter ?? 'bandpass';
    filter.frequency.setValueAtTime(opts.freq ?? 900, t0);
    if (opts.endFreq !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), t0 + opts.duration);
    }
    filter.Q.value = opts.q ?? 1;

    const env = this.ctx.createGain();
    const peak = opts.gain ?? 0.3;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);

    src.connect(filter).connect(env).connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + opts.duration + 0.05);
  }

  // ── Ambient volcanic soundscape ───────────────────────────────────────────
  startMusic(): void {
    if (!this.ctx || !this.musicBus || this.musicRunning) return;
    this.musicRunning = true;
    const t = this.now();

    // Two detuned low saws = the magma drone; a slow LFO breathes the filter.
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 220;
    droneFilter.Q.value = 6;
    droneFilter.connect(this.musicBus);

    for (const [freq, detune] of [[55, -7], [82.4, 6], [110, 3]] as const) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = this.ctx.createGain();
      g.gain.value = 0.16;
      osc.connect(g).connect(droneFilter);
      osc.start(t);
      this.musicNodes.push(osc, g);
    }

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 130;
    lfo.connect(lfoGain).connect(droneFilter.frequency);
    lfo.start(t);
    this.musicNodes.push(lfo, lfoGain, droneFilter);

    // Rumbling ash-wind: looped noise through a slow band-pass sweep.
    if (this.noiseBuffer) {
      const wind = this.ctx.createBufferSource();
      wind.buffer = this.noiseBuffer;
      wind.loop = true;
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 320;
      windFilter.Q.value = 0.7;
      const windGain = this.ctx.createGain();
      windGain.gain.value = 0.11;
      const windLfo = this.ctx.createOscillator();
      windLfo.frequency.value = 0.045;
      const windLfoGain = this.ctx.createGain();
      windLfoGain.gain.value = 190;
      windLfo.connect(windLfoGain).connect(windFilter.frequency);
      wind.connect(windFilter).connect(windGain).connect(this.musicBus);
      wind.start(t);
      windLfo.start(t);
      this.musicNodes.push(wind, windFilter, windGain, windLfo, windLfoGain);
    }

    this.musicBus.gain.setTargetAtTime(this.musicEnabled ? AUDIO.musicVolume : 0, t, 1.2);
  }

  stopMusic(): void {
    if (!this.ctx || !this.musicBus) return;
    const t = this.now();
    this.musicBus.gain.setTargetAtTime(0, t, 0.3);
    const nodes = this.musicNodes;
    this.musicNodes = [];
    this.musicRunning = false;
    window.setTimeout(() => {
      for (const node of nodes) {
        const source = node as AudioScheduledSourceNode;
        if (typeof source.stop === 'function') {
          try {
            source.stop();
          } catch {
            /* already stopped */
          }
        }
        try {
          node.disconnect();
        } catch {
          /* already disconnected */
        }
      }
    }, 800);
  }

  /** Push the drone into a tenser register while a boss is alive. */
  setIntensity(level: number): void {
    if (!this.ctx || !this.musicBus) return;
    const target = this.musicEnabled && this.musicRunning ? AUDIO.musicVolume * (1 + clamp(level, 0, 1) * 0.6) : 0;
    this.musicBus.gain.setTargetAtTime(target, this.now(), 0.8);
  }

  // ── SFX ───────────────────────────────────────────────────────────────────
  pickup(comboStep = 0): void {
    // Rising pentatonic steps make a long collection streak sound like a melody.
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    const semis = scale[Math.min(comboStep, scale.length - 1)];
    const freq = 660 * Math.pow(2, semis / 12);
    this.tone({ type: 'triangle', freq, endFreq: freq * 1.5, duration: 0.16, gain: 0.22 });
    this.tone({ type: 'sine', freq: freq * 2, duration: 0.1, gain: 0.08, delay: 0.01 });
  }

  nearMiss(comboStep = 0): void {
    const freq = 300 + Math.min(comboStep, 20) * 28;
    this.noise({ duration: 0.22, gain: 0.16, filter: 'bandpass', freq: freq * 3, endFreq: freq, q: 3 });
    this.tone({ type: 'sine', freq: freq * 1.4, endFreq: freq * 2.6, duration: 0.18, gain: 0.1 });
  }

  damage(): void {
    this.noise({ duration: 0.45, gain: 0.45, filter: 'lowpass', freq: 1400, endFreq: 90, q: 1 });
    this.tone({ type: 'sawtooth', freq: 190, endFreq: 42, duration: 0.4, gain: 0.3 });
  }

  hitEnemy(): void {
    this.noise({ duration: 0.09, gain: 0.14, filter: 'bandpass', freq: 2400, endFreq: 900, q: 2 });
  }

  enemyDeath(): void {
    this.noise({ duration: 0.24, gain: 0.2, filter: 'lowpass', freq: 2200, endFreq: 220 });
    this.tone({ type: 'triangle', freq: 220, endFreq: 70, duration: 0.2, gain: 0.12 });
  }

  levelUp(): void {
    [0, 4, 7, 12].forEach((semi, i) => {
      this.tone({ type: 'triangle', freq: 440 * Math.pow(2, semi / 12), duration: 0.32, gain: 0.16, delay: i * 0.06 });
    });
  }

  upgradeSelect(): void {
    this.tone({ type: 'square', freq: 520, endFreq: 1040, duration: 0.18, gain: 0.14 });
    this.tone({ type: 'sine', freq: 1040, duration: 0.4, gain: 0.12, delay: 0.08 });
    this.noise({ duration: 0.3, gain: 0.1, filter: 'highpass', freq: 1800 });
  }

  burst(): void {
    // Big layered impact: sub thump + noise blast + upward shriek.
    this.tone({ type: 'sine', freq: 160, endFreq: 34, duration: 0.7, gain: 0.5 });
    this.noise({ duration: 0.6, gain: 0.4, filter: 'lowpass', freq: 5200, endFreq: 160 });
    this.tone({ type: 'sawtooth', freq: 900, endFreq: 2600, duration: 0.25, gain: 0.12 });
  }

  burstCharged(): void {
    this.tone({ type: 'sine', freq: 880, endFreq: 1320, duration: 0.22, gain: 0.1 });
  }

  bossWarning(): void {
    for (let i = 0; i < 3; i++) {
      this.tone({ type: 'square', freq: 110, endFreq: 96, duration: 0.5, gain: 0.22, delay: i * 0.55 });
      this.noise({ duration: 0.5, gain: 0.16, filter: 'lowpass', freq: 400, endFreq: 90, delay: i * 0.55 });
    }
  }

  bossDeath(): void {
    this.tone({ type: 'sawtooth', freq: 300, endFreq: 30, duration: 1.6, gain: 0.4 });
    this.noise({ duration: 1.8, gain: 0.35, filter: 'lowpass', freq: 4000, endFreq: 70 });
  }

  gameOver(): void {
    this.tone({ type: 'sine', freq: 320, endFreq: 60, duration: 1.4, gain: 0.35 });
    this.tone({ type: 'triangle', freq: 240, endFreq: 45, duration: 1.6, gain: 0.22, delay: 0.1 });
    this.noise({ duration: 1.2, gain: 0.25, filter: 'lowpass', freq: 1800, endFreq: 60 });
  }

  uiTap(): void {
    this.tone({ type: 'square', freq: 660, duration: 0.06, gain: 0.08 });
  }

  warning(): void {
    this.tone({ type: 'square', freq: 320, endFreq: 220, duration: 0.2, gain: 0.1 });
  }
}

export const audio = new AudioEngine();
