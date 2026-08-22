/**
 * Dragon Phoenix Ascension brand palette — the single source of truth.
 *
 * Values are transcribed from `brand/BRAND_BIBLE.md` §5 "Color system". The
 * founder directed (2026-08-20) that EMBERLOOP follow the Brand Bible rather
 * than the live site's palette. The site is unchanged; the wider two-palette
 * question in `docs/AI_ONBOARDING.md` §8.1 remains open.
 *
 * Nothing outside this file should hard-code a brand hex.
 */

export const BRAND = {
  /** Primary background. Dark mode is the default experience. */
  voidBlack: 0x0a0a0f,
  /** Cards, panels, elevated surfaces. */
  carbon: 0x14141c,
  /** Primary accent — action, CTAs, the Dragon. */
  emberOrange: 0xff6b2c,
  /** Secondary accent — learning, highlights, the Phoenix. */
  rebirthGold: 0xffb300,
  /** Tertiary accent — data, AI, systems. */
  signalCyan: 0x22d3ee,
  /** Primary text. */
  ghostWhite: 0xf4f4f5,
  /** Secondary text, captions. */
  steel: 0x8b8b99,
} as const;

/** The same values as CSS strings, for Phaser `Text` styles. */
export const BRAND_CSS = {
  voidBlack: '#0a0a0f',
  carbon: '#14141c',
  emberOrange: '#ff6b2c',
  rebirthGold: '#ffb300',
  signalCyan: '#22d3ee',
  ghostWhite: '#f4f4f5',
  steel: '#8b8b99',
} as const;

/**
 * Enemy signalling hues.
 *
 * Three of the six archetypes sit exactly on the brand accents. The other
 * three need hues the brand does not define, because "clearly readable attack
 * telegraphs" is a hard gameplay requirement and six threats cannot be told
 * apart at a glance using three colours. These are treated as functional
 * signal colours, not brand colours, and are deliberately kept in the same
 * saturated-on-void register so the screen still reads as one system.
 */
export const SIGNAL = {
  violet: 0xa855f7,
  magenta: 0xf43f7e,
  crimson: 0xff3b30,
} as const;

/**
 * The fire gradient (Ember Orange → Rebirth Gold) is the brand's signature and
 * the Bible says to use it sparingly. This helper samples it so the few places
 * that do use it stay consistent.
 */
export function fireGradient(t: number): number {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const from = BRAND.emberOrange;
  const to = BRAND.rebirthGold;
  const r = Math.round(((from >> 16) & 0xff) + (((to >> 16) & 0xff) - ((from >> 16) & 0xff)) * clamped);
  const g = Math.round(((from >> 8) & 0xff) + (((to >> 8) & 0xff) - ((from >> 8) & 0xff)) * clamped);
  const b = Math.round((from & 0xff) + ((to & 0xff) - (from & 0xff)) * clamped);
  return (r << 16) | (g << 8) | b;
}
