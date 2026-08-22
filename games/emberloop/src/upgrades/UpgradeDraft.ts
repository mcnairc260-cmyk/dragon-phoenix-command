import { weightedIndex } from '../core/Rng';
import { UPGRADES, UPGRADES_BY_ID, type Rarity, type UpgradeDef, type UpgradeLevels } from './UpgradeDefs';

/** Relative draw weight per rarity before level scaling. */
export const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 100,
  rare: 32,
  legendary: 7,
};

export interface DraftedUpgrade {
  def: UpgradeDef;
  /** The level the player would own after taking this card (1-based). */
  nextLevel: number;
  isNew: boolean;
}

export interface DraftOptions {
  /** Player level — deeper runs bias slightly toward rarer cards. */
  playerLevel?: number;
  count?: number;
}

/**
 * Draw N distinct upgrade choices.
 *
 * - Upgrades already at max level are excluded.
 * - Rarity weights are scaled by a small "luck" bonus from player level, so late
 *   runs see legendaries more often (weight x (1 + level/25) for non-commons).
 * - If fewer than N upgrades remain available, returns however many exist.
 */
export function draftUpgrades(
  owned: UpgradeLevels,
  rng: () => number,
  options: DraftOptions = {},
): DraftedUpgrade[] {
  const count = options.count ?? 3;
  const playerLevel = options.playerLevel ?? 1;
  const luck = 1 + Math.min(playerLevel, 30) / 25;

  const pool = UPGRADES.filter((def) => (owned[def.id] ?? 0) < def.maxLevel);
  const weights = pool.map((def) => {
    const base = RARITY_WEIGHT[def.rarity];
    return def.rarity === 'common' ? base : base * luck;
  });

  const picked: DraftedUpgrade[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = weightedIndex(weights, rng());
    if (index < 0) break;
    const def = pool[index];
    const nextLevel = (owned[def.id] ?? 0) + 1;
    picked.push({ def, nextLevel, isNew: nextLevel === 1 });
    // Draw without replacement so a card never appears twice in one draft.
    pool.splice(index, 1);
    weights.splice(index, 1);
  }
  return picked;
}

/** Immutably apply a taken card to the owned-levels map. */
export function takeUpgrade(owned: UpgradeLevels, id: string): UpgradeLevels {
  const def = UPGRADES_BY_ID.get(id);
  if (!def) return owned;
  const next = Math.min((owned[id] ?? 0) + 1, def.maxLevel);
  return { ...owned, [id]: next };
}
