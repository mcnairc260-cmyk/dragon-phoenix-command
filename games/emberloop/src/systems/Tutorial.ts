/**
 * First-run tutorial: four beats, each satisfied by *doing* the thing rather
 * than reading about it. Every step has a timeout so the whole sequence is over
 * inside ~20 seconds even if the player ignores it.
 */

export interface TutorialSignals {
  distanceMoved: number;
  embersCollected: number;
  nearMisses: number;
  burstsUsed: number;
  burstReady: boolean;
}

interface Step {
  id: string;
  html: string;
  /** Satisfied → advance. */
  done: (s: TutorialSignals) => boolean;
  /** Hard timeout in seconds. */
  timeout: number;
  /** Only show once this is true (used to delay the burst prompt). */
  ready?: (s: TutorialSignals) => boolean;
}

const STEPS: Step[] = [
  {
    id: 'move',
    html: '<b>Drag anywhere</b> — the phoenix flies to your finger',
    done: (s) => s.distanceMoved > 260,
    timeout: 6,
  },
  {
    id: 'collect',
    html: 'Sweep up <b>ember shards</b> to level up',
    done: (s) => s.embersCollected >= 2,
    timeout: 6,
  },
  {
    id: 'graze',
    html: 'Fly <b>close to danger</b> to build Heat — Heat multiplies your score',
    done: (s) => s.nearMisses >= 1,
    timeout: 6,
  },
  {
    id: 'burst',
    html: 'Burst meter full — <b>let go</b> to unleash the Phoenix Burst',
    done: (s) => s.burstsUsed >= 1,
    ready: (s) => s.burstReady,
    timeout: 8,
  },
];

export class Tutorial {
  private index = 0;
  private stepTime = 0;
  private currentId: string | null = null;
  finished = false;

  constructor(private readonly enabled: boolean) {
    if (!enabled) this.finished = true;
  }

  /**
   * Advance the tutorial. Returns the hint HTML to display, or null to hide.
   * The returned string is stable while a step is active so the caller can skip
   * redundant DOM writes.
   */
  update(dt: number, signals: TutorialSignals): string | null {
    if (!this.enabled || this.finished) return null;

    const step = STEPS[this.index];
    if (!step) {
      this.finished = true;
      return null;
    }

    if (step.ready && !step.ready(signals)) {
      // Waiting for the prerequisite (e.g. a full burst meter); show nothing.
      this.currentId = null;
      return null;
    }

    if (this.currentId !== step.id) {
      this.currentId = step.id;
      this.stepTime = 0;
    }
    this.stepTime += dt;

    if (step.done(signals) || this.stepTime >= step.timeout) {
      this.index += 1;
      this.currentId = null;
      if (this.index >= STEPS.length) this.finished = true;
      return null;
    }
    return step.html;
  }
}
