import { describe, expect, it } from 'vitest';
import { BOSS } from './GameConfig';
import { ATTACK_RECOVERY, ATTACK_TIPS, BOSSES, PHASE_SHARES, attacksForStage, bossFor } from './bosses';
import { FACTIONS } from './factions';

describe('faction bosses', () => {
  it('has the six roster bosses, one per faction, in board order', () => {
    expect(BOSSES.map((b) => b.name)).toEqual(['MAGMATHAR', 'CRIOTHARIS', 'NETHERMORPH', 'BLIGHTBLOOM', 'SKYREND', 'AURELION']);
    expect(BOSSES.map((b) => b.faction)).toEqual(FACTIONS.map((f) => f.id));
  });

  it('gives them the 18 distinct signature attacks of the roster, each with a recovery time', () => {
    const all = BOSSES.flatMap((b) => b.attacks);
    expect(all).toHaveLength(18);
    expect(new Set(all).size).toBe(18);
    for (const id of all) expect(ATTACK_RECOVERY[id]).toBeGreaterThan(0);
    for (const b of BOSSES) expect(b.attackNames).toHaveLength(3);
  });

  it('unlocks one more attack per phase', () => {
    const b = BOSSES[0];
    expect(attacksForStage(b, 0)).toEqual(['eruption-rings']);
    expect(attacksForStage(b, 1)).toEqual(['eruption-rings', 'meteor-rain']);
    expect(attacksForStage(b, 2)).toEqual(['eruption-rings', 'meteor-rain', 'lava-wave']);
  });

  it('splits HP so phase 2 starts below 65% and phase 3 below 30%', () => {
    expect(PHASE_SHARES.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const total = BOSS.stageHp.reduce((a, b) => a + b, 0);
    expect(1 - BOSS.stageHp[0] / total).toBeCloseTo(0.65, 1);
    expect(BOSS.stageHp[2] / total).toBeCloseTo(0.3, 1);
  });

  it('rotates through all six bosses, then repeats', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => bossFor(i).id)).toEqual([
      'magmathar',
      'criotharis',
      'nethermorph',
      'blightbloom',
      'skyrend',
      'aurelion',
      'magmathar',
      'criotharis',
    ]);
  });
});

describe('attack tips', () => {
  it('gives every attack a short dodge tip', () => {
    for (const b of BOSSES) {
      for (const id of b.attacks) {
        expect(ATTACK_TIPS[id].length).toBeGreaterThan(0);
        expect(ATTACK_TIPS[id].length).toBeLessThanOrEqual(24);
      }
    }
  });
});
