/**
 * Haptics. In the native iPhone app (Capacitor) this drives the Taptic Engine;
 * in a browser it falls back to navigator.vibrate, which iOS Safari ignores.
 * Silently no-ops wherever neither is available.
 */
import { Capacitor } from '@capacitor/core';
import { Haptics as NativeHaptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

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

// iOS has no free-form vibration patterns; map each event to the closest Taptic effect.
const NATIVE: Record<HapticPattern, () => Promise<void>> = {
  tap: () => NativeHaptics.impact({ style: ImpactStyle.Light }),
  pickup: () => NativeHaptics.selectionChanged(),
  damage: () => NativeHaptics.impact({ style: ImpactStyle.Heavy }),
  burst: () => NativeHaptics.impact({ style: ImpactStyle.Medium }),
  levelUp: () => NativeHaptics.notification({ type: NotificationType.Success }),
  boss: () => NativeHaptics.notification({ type: NotificationType.Warning }),
  gameOver: () => NativeHaptics.notification({ type: NotificationType.Error }),
};

class Haptics {
  enabled = true;

  private readonly native = Capacitor.isNativePlatform();

  private get webSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  play(pattern: HapticPattern): void {
    if (!this.enabled) return;
    if (this.native) {
      NATIVE[pattern]().catch(() => {
        /* haptics are a bonus, never a requirement */
      });
      return;
    }
    if (!this.webSupported) return;
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      /* some browsers throw when the page is not visible */
    }
  }

  stop(): void {
    if (this.native || !this.webSupported) return;
    try {
      navigator.vibrate(0);
    } catch {
      /* ignore */
    }
  }
}

export const haptics = new Haptics();
