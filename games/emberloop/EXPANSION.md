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

## Founder decisions (2026-11-20)

| # | Question | Decision |
|---|---|---|
| 1 | What powers ultimates | **b — something else; founder to specify.** Open. Facts that constrain it: the ASCENSION bar is the XP bar (empties at every level-up), and release-to-Burst means any ultimate input must not need a finger lift. |
| 2 | Shards vs the 21 upgrades | **a — shards replace them**; old effects return as synergies. Done (Stage 4). |
| 3 | Bosses vs THE ASHBORN | **a — six faction bosses replace the Ashborn**, rotating by faction. Stage 3. |
| 4 | Healing with 3 hearts | **a — "heal" = restore 1 heart**, with a cooldown. Done (Nature Shard). |

## Stage 4 — Power Shards (done)

- 12 crystals cut from `art/power-shards.png` (`scripts/extract-shards.py`) →
  `src/assets/shards/` (128 px PNGs, 308 KB).
- `src/upgrades/UpgradeDefs.ts` now holds the 12 shards; table in
  `GAME_DESIGN.md` §8. New stats: `damageMul`, `enemySlow`, `rangeMul`,
  `regenInterval`, `cooldownMul`; hard limits `FROST_CAP` (48%) and
  `COOLDOWN_FLOOR` (72%).
- XP collection, levels and the 3-card draft are the existing systems (no
  second level counter). Cards show crystal art, effect now → next, LV n/max.
- Ascension is in the catalogue but **kept out of the draft** until ultimates
  exist, so it is never a dead pick.
- Upgrades reset every run (as before).
- Tests: 21 shard unit tests (limits, caps, no negative cooldowns, Ascension
  excluded, draft rules). Playwright, picking through the real level-up
  screen: Ember +12% damage dealt; Frost 4 → enemies moved 12.6 px vs 24.3 px
  in the same game time (48%); Void graze 46 → 55 px, Burst 190 → 228 px;
  Nature heal 1 → 2 hearts, regrowth 2 → 3, capped at 3; Time Burst cooldown
  1.1 → 0.79 s; Arcane L3 fired 15 bolts in 5 s of game time; Ward shield on;
  zero console errors.
- Fixed on the way: pause/level-up panels taller than the screen clipped their
  top (now auto-margin centred), and the tutorial tip no longer sits on top of
  menus.

## Not started

Stage 3 bosses, Stage 5 synergies, Stage 6 ultimates, Stage 7
evolution stages, Stage 8 full QA. Not tested on a real device.
