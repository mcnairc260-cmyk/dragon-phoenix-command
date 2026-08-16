/** Thin wrapper over navigator.vibrate — silently no-ops where unsupported. */

export type HapticPattern = 'tap' | 'pickup' | 'damage' | 'burst' | 'levelUp' | 'boss' | 'gameOver';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 8,
  pickup: 6,
  damage: [0, 40, 30, 60],
  burst: [0, 18, 24, 45],
  levelUp: [0, 12, 40, 12],
  boss: [0, 70, 60, 70],
  gameOver: [0, 90, 60, 140],
};

class Haptics {
  enabled = true;

  private get supported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  play(pattern: HapticPattern): void {
    if (!this.enabled || !this.supported) return;
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      /* some browsers throw when the page is not visible */
    }
  }

  stop(): void {
    if (!this.supported) return;
    try {
      navigator.vibrate(0);
    } catch {
      /* ignore */
    }
  }
}

export const haptics = new Haptics();
