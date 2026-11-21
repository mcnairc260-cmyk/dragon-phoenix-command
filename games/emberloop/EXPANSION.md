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
| 1 | What powers ultimates | **Founder (2026-11-21): "Ultimates should replace burst so the release is the control."** This overrides the brief's "keep Phoenix Burst separate". Implemented: the Burst meter and release now fire the equipped ultimate; the Phoenix Burst is the innate ultimate every run starts with. Do not re-add a separate Burst. |
| 1b | What charges the ultimate | **Founder (2026-11-21): kills only.** Holding, flying and grazing no longer charge it. 14 per kill (~7 kills), 50 per elite, 50 per boss stage, full on a boss kill. Kills made by an ultimate (including the starting Burst, its burn, bolts and lightning) never charge it, so an ultimate cannot refill itself. Verified: 3 s of flying = 0, a graze = 0, a kill = +14, an elite = +50, Burst/Supernova killing 6 enemies = 0. |
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

## Stage 6 — Ultimates (done) and Stage 7 — Evolution (basic, done)

How it works (founder decision 1, above):
- Every run starts with the **Phoenix Burst** as the equipped ultimate (it
  works exactly as before). Same meter, same charge sources, release to fire.
- **Ascension Shard** is offered once the player owns any element shard. Level 1
  opens "choose your ultimate", listing only the ultimates of element shards
  owned. The choice replaces the Burst for the rest of the run (one per run).
- Ascension levels 2 and 3: ultimate power ×1.35 / ×1.7.
- Evolution stages from Ascension level: **Awakened** (gold aura ring),
  **Radiant** (brighter ring, stronger flame trail), **Transcendent** (second
  counter-rotating ring). Overlays sit behind the bird; the art is unchanged.
- The bottom bar shows the equipped ultimate's name and colour.

| Ultimate | Element | Effect (Ascension 1 values, ×power) | Duration |
|---|---|---|---|
| Phoenix Supernova | Ember | 260 px blast, 8 dmg (bosses half), burn 1.6 dps for 3 s, clears bullets, 0.9 s protection | 3 s |
| Absolute Zero | Frost | Wave to 300 px over 0.6 s, 3 dmg, freezes 2.5 s (+0.5 s per tier), bosses slowed 50% for 4 s | 3 s |
| Void Collapse | Void | Singularity on the nearest enemy group, ≥130 px from the phoenix; pulls 280 px, grinds 1.2 dmg / 0.25 s, implodes 6 dmg in 170 px; bosses not moved | 2.6 s |
| Worldroot Rebirth | Nature | +1 heart (+2 at tier 3), shield up, roots 4 dmg in 220 px, +1 heart 4 s later; all capped at 3 hearts | 5 s |
| Storm Apocalypse | Storm | 12 strikes, 0.25 s apart, 3 dmg; boss → elites → least-struck → nearest; chain to 2 at 60% / 36%; speed ×1.3 for 4 s | 3 s |
| Celestial Ascendancy | Arcane | 3 bolts every 0.35 s at the nearest enemies, 1.5 dmg, pierce 2; magenta-gold aura; no invulnerability | 6 s |

Radii scale with Void Shard range; damage with Ember. Code:
`src/upgrades/Ultimates.ts` (data, unit-tested), `src/scenes/UltimateController.ts`
(effects), `GameScene.doBurst` (dispatch; the Burst itself unchanged).

Safety rules (brief §15): every lasting effect has a fixed duration and the
next cast waits for it (cooldown = duration + 0.4 s); damage over time ticks
4× per second, never per frame; nothing triggers on damage, so nothing can
recurse; heals cap at max hearts; bosses are never frozen or pulled; frozen
or void-held enemies are harmless **and do not count as grazes** (otherwise an
ultimate refilled its own charge — found in testing).

Verified in Playwright, through the real draft → ultimate choice → hold and
release, then stepping exact game time, 6 tough enemies around the phoenix
(damage to all 6 over 6 s): Supernova 86, Void Collapse 88 (all pulled to the
singularity, phoenix unharmed), Celestial 73, Storm 57 (all 6 struck, speed
1.3 → 1), Worldroot 24 (hearts 1 → 3, shield on), Absolute Zero 18 (all 6
frozen at 1 s, thawed by 3 s). Zero console errors. Two design bugs found and
fixed by these tests: the first Void Collapse opened on the phoenix and
dragged enemies into the player; Storm kept striking the same three enemies.

## Not started

Stage 3 bosses (next), Stage 5 synergies, Stage 7 polish beyond the basic
auras, Stage 8 full QA. Not tested on a real device. Ultimate balance needs
real play.
