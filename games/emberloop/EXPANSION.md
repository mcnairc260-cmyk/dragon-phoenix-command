# EMBERLOOP — Gameplay Expansion: status

Tracks the founder's "Master Gameplay Expansion" brief (2026-11-20): 18 enemies,
6 bosses, 12 Power Shards, 10 synergies, 6 ultimates, 3 Phoenix evolution
stages. Work goes in tested stages. This file is the source of truth for what
is done, what is not, and what is waiting on a founder decision.

## Stage 1 — Audit (done)

How the existing systems really work (read from code, not labels):

| On screen | What the code does | File |
|---|---|---|
| **ASCENSION** bar (cyan) | It is the **XP bar**: fills from ember shards and kills; full = level-up and a 3-card upgrade draft. | `ui/Hud.ts`, `systems/Leveling.ts` |
| "Ascended" phoenix | Visual form while the score multiplier is ≥ 3×. Not related to the Ascension bar. | `systems/Scoring.ts` `isAscended` |
| **HEAT** bar | Combo timer (3.2 s, refreshed by grazes and shards). Combo sets the score multiplier (up to 8×). | `systems/Scoring.ts` |
| **Graze** | An enemy or bullet passing within 46 px without hitting. +combo, +score, +Burst charge. Since 2026-11-20 also fires a graze shot (below). | `scenes/GameScene.ts` |
| **PHOENIX BURST** bar | Separate charge (holding, moving, grazes, kills). Release your finger with a charge = 190 px blast, 4 damage, clears bullets. | `entities/Player.ts`, `GameScene.doBurst` |
| Level / upgrades | Level-up pauses and offers 3 of **21 existing upgrades** (Emberblades, Chain Lightning, Homing Embers, Cinder Shield…). | `upgrades/` |
| XP pickups | **Already exist**: the gold ember shards enemies drop. | `entities/Pickup.ts` |
| Enemies | 6 behaviours: cinder (chaser), dart (charger, telegraph line), spitter (shooter), orbiter, splitter, mine. Elites every ~46 s. | `entities/Enemy.ts` |
| Boss | One boss, THE ASHBORN, 3 stages, first at 1:20 then every 1:40. | `entities/Boss.ts` |

Stack: Vite + TypeScript + Phaser 3, static build, Capacitor iOS shell.
Tests: Vitest for pure logic; Playwright playtests (scripted, not committed).

## Stage 2 — Enemy factions (done)

- All 18 enemies from `art/enemy-collection.png` cut out with
  `scripts/extract-enemies.py` → `src/assets/enemies/` (128 px PNGs, 500 KB).
- `src/config/factions.ts` is the **asset manifest and data table**: faction,
  role, sprite, facing, speed/HP/size multipliers.
- Roles reuse the tuned behaviours: chaser = cinder AI, charger = dart AI
  (rest → telegraph line in faction colour → locked dash → recover), shooter =
  spitter AI (stand-off, telegraph, aimed shot in faction colour).
- Factions arrive over time with a toast: Volcanic 0:00, Frostborn 0:35,
  Shadow 1:10, Nature 1:50, Aerial 2:30, Arcane 3:10. The newest faction is
  weighted double.
- Sprites stay upright, mirror to face movement, lean, breathe; chargers shudder
  while telegraphing. A faction-coloured outline keeps dark creatures readable.
- Orbiters, splitters and mines are unchanged (procedural).
- Tests: 5 unit tests in `config/factions.test.ts`; Playwright: all 18 spawned
  and photographed in-arena; zero console errors.

## Founder option B — graze shots (done)

Every graze now fires a real ember from the phoenix (`GRAZE_SHOT` in
`GameConfig.ts`): 1 damage at the grazed enemy, or 0.5 at the nearest enemy
(within 260 px) when you grazed a bullet. Verified: with the finger held the
whole time (so the Burst never fires) a test run fired 92 graze shots and
killed 14 enemies. **Needs real play to judge balance**; enemies may need to
be tougher.

## Waiting on founder decisions (before Stages 3–7)

1. **What powers ultimates.** The brief prefers the Ascension bar, but that bar
   *is* the XP bar: it empties at every level-up, so it cannot also store an
   ultimate charge. Recommendation: a separate small ultimate ring, charged by
   kills and grazes, activated by tapping a button with a second finger, so it
   never triggers the release-to-Burst.
2. **Power Shards vs the 21 existing upgrades.** They are the same mechanic
   (pause, pick 1 of 3). Recommendation: the 12 shards *become* the upgrade
   pool, and the best existing effects become shard or synergy effects
   (Emberblades → Firestorm ring, Chain Lightning → Thunder Tempest, Cinder
   Shield → Ward, Homing Embers → Arcane extra shots). Keeping both pools would
   bury the shards.
3. **Bosses vs THE ASHBORN.** Recommendation: the six faction bosses replace
   the Ashborn and rotate by faction; boss art must be cut from busy poster
   backgrounds, which may need clean single-boss images.
4. **Healing.** The phoenix has 3 hearts, not an HP number. Recommendation:
   "heal 15%" becomes "restore 1 heart" with a cooldown.

## Not started

Stage 3 bosses, Stage 4 shards, Stage 5 synergies, Stage 6 ultimates, Stage 7
evolution stages, Stage 8 full QA. Not tested on a real device.
