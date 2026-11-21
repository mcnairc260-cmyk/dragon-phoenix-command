# EMBERLOOP — Game Design

The one-line pitch: **fly a phoenix around a collapsing volcanic caldera, get as
close to death as you dare, and cash the risk in as score.**

Every number quoted here lives in `src/config/GameConfig.ts`. If a value in this
document and a value in that file disagree, the file is right.

---

## 1. The loop

1. Tap once from the title — you are already flying.
2. Drag anywhere; the phoenix mirrors your finger with slight momentum, so your
   thumb never has to sit on top of it.
3. Sweep up **ember shards** (score + currency + XP) — fast, in clusters, for the
   Ember Chain bonus.
4. Pass *close* to enemies and bullets to bank **Heat**, which raises the score
   multiplier.
5. Level up → the game pauses and offers **three upgrade cards**; pick one.
6. Difficulty rises with **the clock only** — levelling never makes it harder.
7. Elites arrive every ~46 s; **THE ASHBORN** wakes at 1:20, then every 1:40.
8. Three hits and the run ends. Results screen → **one tap to run again.**

The core tension: Heat only comes from being near things that kill you, and a
single hit wipes the whole combo.

## 2. Controls

**Three steering modes** (pause menu; the choice persists). All three resolve to
"here is a target point", so the movement physics are identical between them —
only where the target comes from differs.

| Mode | How it steers | Why |
|---|---|---|
| **Drag (offset)** — default | The phoenix moves by the same delta your finger moves, from wherever it already was, amplified ×1.75 | On a phone your finger sits on top of whatever it points at. With fly-to-finger steering the phoenix is permanently hidden under your thumb, exactly when you need to see it to dodge. Park your thumb low; the phoenix stays visible. |
| **Joystick** | Touch plants a stick; direction sets heading, distance sets throttle (full at 62 px) | Same benefit, familiar to twin-stick players. |
| **Fly to finger** | The original absolute mode | Fine on desktop with a mouse, or on a tablet where the hand is off to one side. |

| Input | Effect |
|---|---|
| Press and drag anywhere | Steer per the mode above. Speed ramps with distance to the target, hitting full speed ~90 px out, so small nudges give fine control. |
| Kills | Charge the ultimate meter (founder decision 2026-11-21: kills only; ~7 kills per charge). |
| Release | **Fire your ultimate** if a charge is stored: the Phoenix Burst until the Ascension Shard swaps it for an elemental ultimate (see `EXPANSION.md`, Stage 6). |
| Pause button (top-right) | Pause + settings. |
| Desktop extras | Space = burst, Esc/P = pause. |

You never need a finger on the phoenix itself. In the default offset mode your
thumb can rest at the bottom of the screen while the phoenix flies in the middle,
which is the whole point: you can see what you are dodging.

**Phoenix Burst:** 190 px radius (scalable), 4 damage, destroys every hostile
bullet in range, screen shake, chromatic flash, 0.35× slow motion for 0.42 s, and
a 1.1 s cooldown so it cannot be spammed. The `Twin Phoenix` legendary stores a
second charge.

## 3. Scoring

`src/systems/Scoring.ts` — pure, unit-tested.

**Sources** (all multiplied by the current multiplier):

| Source | Base |
|---|---|
| Ember shard | 12 |
| Near-miss | 18 |
| Ordinary kill | enemy-specific, 20–55 |
| Elite kill | 220 |
| Boss kill | 1,500 |
| Survival | 8 / second |

**Combo and Heat.** Every near-miss and every shard adds +1 combo and refreshes a
3.2 s timer. When the timer expires the combo collapses to zero. **Heat** is the
on-screen bar: it is simply the fraction of that timer remaining, so it visibly
drains and refills as you play.

**Multiplier** = `1 + floor(combo / 3) × 0.5`, capped at **8×**. So combo 3 is
1.5×, combo 12 is 3×, combo 42 is the 8× cap.

At **3×** the phoenix visually ascends: a larger, sharper silhouette, a longer
tail, a denser trail and a hotter glow.

**Taking a hit breaks the combo outright** — the multiplier is the whole reward
for risk, and losing it is the whole punishment.

## 4. Difficulty scaling

`src/systems/Difficulty.ts` — pure, unit-tested.

**Difficulty is a function of the clock, and nothing else.**

```
threat = elapsed_seconds / 60
```

This is the single most important rule in the game, and it is enforced by a
test: `threatAt` and `difficultyAt` take *one* argument each, so there is no way
for player progress to leak into enemy pressure.

It did not always work this way. Threat used to include a term for player level,
which meant collecting shards quickly — the entire point of the game — summoned
more enemies, faster enemies and tougher enemies. That inverted the incentive:
the optimal play was to *ignore* shards. Levelling is now pure upside. Collect
fast and you face the same wave as everyone else, with more upgrades to face it.

| Derived value | Formula | Range |
|---|---|---|
| Spawn interval | `1.45 × 0.87^threat` | 1.45 s → 0.32 s floor |
| Enemy speed | `1 + threat × 0.075` | 1× → 2.0× cap |
| Enemy HP | `1 + floor(threat) × 0.3` | steps in whole numbers |
| Max live enemies | `6 + threat × 2.0` | 6 → 28 cap |
| Elite interval | `46 − threat × 5` | 46 s → 26 s floor |
| Arena collapse interval | `24 − threat × 2.2` | 24 s → 9 s floor |

**Elites are on the clock too**, for the same reason — an elite is a 10-shard
payout as much as a threat, and it must not arrive sooner because you played
well. They used to spawn on every 3rd level-up.

**Archetype unlocks** are on the clock, so the first minute teaches one threat at
a time:

| Time | Joins the spawn table |
|---|---|
| 0:00 | Cinder |
| 0:14 | Dart |
| 0:30 | Spitter |
| 0:50 | Orbiter |
| 1:14 | Splitter |
| 1:36 | Magma Mine |

### Rewarding fast collection

Three things now pull in the same direction:

1. **Levelling costs you nothing.** See above.
2. **Ember Chain.** Shards collected within 2.8 s of each other build a streak.
   Every 4 chained shards adds +1 XP per shard (capped at +3), announced on
   screen at each step. Sweeping a cluster is worth materially more than
   drifting between shards.
3. **More shards to sweep.** Ambient spawn every 1.9 s, up to 16 on the floor.

**Levelling.** XP to reach the next level is `round(9 × 1.24^(n-1) + (n-1) × 3)`
— 9 XP for the first, so the first upgrade choice lands inside the opening
~15 seconds. Shards give 1 XP plus the chain bonus; kills 1; elites 6; boss
stages 10; a boss kill a further 24.

## 5. Enemies

| # | Name | Colour | Behaviour |
|---|---|---|---|
| 1 | **Cinder** | Ember orange | Slow, relentless, straight-line pursuit. The tutorial enemy. |
| 2 | **Dart** | Violet | Rests → telegraphs a bright line for 0.72 s (tracking loosely) → commits to a fixed straight charge. Dodge on the line, not on the enemy. |
| 3 | **Spitter** | Electric blue | Holds ~210 px stand-off, telegraphs for 0.55 s, fires an aimed shot (elites fire a 5-shot fan). |
| 4 | **Orbiter** | Gold | Approaches, circles you at 140 px for 2.6 s, telegraphs, then dives fast along a locked line. |
| 5 | **Splitter** | Magenta | Slow, tanky; on death divides into 3 faster half-size shards. Killing it near you is a mistake. |
| 6 | **Magma Mine** | Crimson | Spawns *inside* the arena and never moves. Pulses faster and faster, then detonates in a 96 px blast. Area denial. |

**Faction species (2026-11-20).** Cinder, Dart and Spitter now appear as the
founder's 18 faction creatures (chaser / charger / shooter of six factions),
keeping these exact behaviours with per-species speed, toughness and size.
Data: `src/config/factions.ts`; details: `EXPANSION.md`.

**Readability rules:** every committed attack has a telegraph you can see before
it lands; the telegraph line shows exactly where the attack will go; each
archetype has a distinct silhouette *and* a distinct colour, so threat type is
legible at a glance in a crowded arena.

### Faction bosses

Since 2026-11-21 six faction bosses from the founder's Boss Roster replace THE
ASHBORN (founder decision "3a"). They rotate in faction order — Magmathar,
Criotharis, Nethermorph, Blightbloom, Skyrend, Aurelion, then repeat — one per
encounter. **First at 1:20, then every 1:40**, with +45% HP per encounter and a
three-second named warning (e.g. "MAGMATHAR — The Core Titan — awakens").
Data: `src/config/bosses.ts`; attacks: `src/entities/bossAttacks.ts`; non-bullet
attacks use `src/entities/Hazards.ts`.

**Phases** (brief): three stages sized 35 / 35 / 30% of total HP, so phase 2
starts below 65% and phase 3 below 30%. Phase 1 uses the first signature attack,
phase 2 adds the second, phase 3 adds the third and may combine two at once
(35% of the time, with a 40% longer breather after). Between stages the boss is
briefly invulnerable, bullets and hazards clear, six shards drop.

| Boss | Moves | Phase 1 | Phase 2 adds | Phase 3 adds |
|---|---|---|---|---|
| Magmathar, Core Titan | drifts | **Lava Wave** — a fire band sweeps the board; the outlined gap is safe | **Meteor Rain** — 8 marked impacts in two waves, one on you | **Eruption Rings** — 3 bullet rings, each with a gap |
| Criotharis, Winter Alpha | swoops | **Ice Shard Barrage** — 4 aimed 5-shot fans | **Frost Nova** — wind-up, then 2 dense rings with 2 gaps each | **Ice Wall Prison** — 3 walls in a U around you (open side toward the centre), plus aimed shots |
| Nethermorph, Void Harbinger | keeps its distance | **Void Beams** — 2 volleys of 3 telegraphed beams | **Teleport Strike** — vanishes, reappears 150 px from you, marked slam, then a ring | **Gravity Well** — pulls you toward a small harmful core for 3.5 s |
| Blightbloom, Wildfeeder | rooted at the top | **Seed Swarm** — 16 seeds that curve toward you for 1.4 s | **Toxic Spores** — 3 lingering clouds near you | **Vine Snare** — 4 marked patches; caught = 82% slower for 1.1 s, no damage |
| Skyrend, Storm Crown | swoops | **Feather Storm** — 4-arm spiral for 1.8 s | **Dive Bomb** — marks your spot, dives onto it, then a ring | **Wind Tornadoes** — 3 wandering tornadoes that hurt and shove |
| Aurelion, Arcane Warden | drifts | **Orbiting Orbs** — 6 orbs circling it, radius breathing 60–210 px | **Arcane Laser Grid** — 3 horizontal + 2 vertical beams, safe cells between | **Reality Rift** — 3 rifts (never on you) that pulse damage |

**Fairness rules:** every attack shows a telegraph before it can hurt (earliest
measured hit on a still player: 0.8 s); bullets stay grazeable; walls never
damage and always leave a side open; hazards never exceed 40 at once; a stage
break cancels running attacks and clears the screen.

**Felling one pays properly** — 1,500 score, 40 shards, 24 XP, **+1 health**, and a
full ultimate charge.

## 6. Arena hazards

The caldera periodically **collapses in wedges**. A sector strobes amber for
1.6 s (unmistakable warning), becomes damaging lava for 4.2 s, then fades. As
threat climbs, collapses come as often as every 8 seconds, progressively shrinking
the safe area and forcing movement.

Standing in lava costs 1 HP at most every 0.9 s, so a mistake is survivable but
expensive.

## 7. Player systems

- **3 health**, shown as pips. Each hit grants **1.25 s** of invulnerability
  (extendable) and breaks the combo.
- **Forgiving hitbox:** the collision radius (9 px) is smaller than the sprite,
  while the **near-miss ring is 46 px** — so the space that rewards you is much
  larger than the space that kills you.
- **Near-miss cooldown** of 0.5 s per object, so one enemy cannot be farmed by
  hovering next to it.
- **Ultimate energy** from kills only (founder decision 2026-11-21): 14 per kill
  (~7 kills per charge), 50 per elite, 50 per boss stage broken, full on a boss
  kill. Holding, flying and grazing do not charge it, and kills made by the
  ultimate itself (including the starting Burst) never do.

## 8. Power Shards (upgrades)

Since 2026-11-20 the level-up draft offers the founder's **12 Power Shards**
(art: `art/power-shards.png`), replacing the original 21 upgrades (founder
decision "2a"). Draw weights stay common 100 / rare 32 / legendary 7, with
non-commons scaled by `1 + level/25`. A maxed shard is never offered, and the
three cards in a draft are always distinct. Cards show the crystal, the effect
now → next, and `LV n / max`. Values live in `src/upgrades/UpgradeDefs.ts`.

| Shard | Rarity | Max | Effect per level | Hard limit |
|---|---|---|---|---|
| Ember | Common | 5 | +12% damage (graze shots, Burst, bolts, crit splash, bosses) | — |
| Frost | Common | 4 | Enemies run 12% slower (movement and wind-ups); bosses half | 48% |
| Void | Common | 5 | +10% range: graze ring, graze-shot reach, Burst radius | — |
| Nature | Rare | 4 | Restore 1 heart on pick; from L2 regrow 1 heart every 45 / 35 / 25 s | never above 3 hearts |
| Storm | Common | 5 | +8% flight speed | — |
| Arcane | Legendary | 3 | Auto-fire 1 / 2 / 3 seeking bolts every 1.6 / 1.4 / 1.2 s | 3 bolts |
| Ascension | Legendary | 3 | L1: trade the Burst for an elemental ultimate (needs an element shard); L2–L3: ultimate ×1.35 / ×1.7 and evolution | — |
| Titan | Common | 4 | +7% chance to shrug off a hit | 28% |
| Time | Common | 4 | All cooldowns 7% shorter (Burst, shield, regen, bolts) | 72% of base |
| Hunter | Common | 4 | +6% crit chance (double damage + splash blast) | 24% |
| Ward | Rare | 3 | Shield blocks 1 hit; recharge 14 / 11 / 8 s | — |
| Cosmic | Common | 4 | +12% XP and ember value | — |

The original upgrades' mechanics (orbiting blades, chain lightning, magma
trail, shrapnel, bullet reflection, second Burst charge, emergency revive)
remain implemented and stat-driven; they return as shard **synergies**
(`EXPANSION.md`, Stage 5). All levels fold into one stat block via
`computeStats()`, which also applies Time to every timed effect and enforces
the hard limits.

### Synergies

Taking every shard of a pair (or trio) at least once switches on a synergy for
the rest of the run. Several can be active together. A level-up card that would
complete one glows pink and says so; the pause menu lists active synergies; a
message announces each unlock. Data: `src/upgrades/Synergies.ts` (`SYN` holds
every number); effects: `src/scenes/SynergyController.ts`, with Firestorm's
blades and Molten Armor's armour folded into `computeStats()`.

| Synergy | Shards | Effect | Limit |
|---|---|---|---|
| Firestorm | Ember + Storm | 2–4 fire-orange blades orbit you (the old Emberblades); a blade hit chains lightning to 2 enemies | chain once per 1.2 s |
| Frozen Barrage | Frost + Arcane | 5-shard ice fan at the nearest enemy every 2 s; chilled enemies move 30% slower; 3 hits freeze for 1.2 s | bosses are never frozen |
| Shadow Execution | Void + Hunter | A crit detonates a 90 px void explosion (2 dmg) | once per 0.6 s; raw damage, so it cannot crit again |
| Phoenix Renewal | Nature + Ward | A shield unbroken for 12 s blooms: +1 heart | resets when the shield breaks; never above 3 hearts |
| Thunder Tempest | Storm + Arcane | Every 2.5 s lightning hits the nearest enemy (3 dmg) and jumps 3 times at 70% each | 3 jumps |
| Molten Armor | Ember + Titan | +10% shrug-off chance; whatever hits you is scorched (85 px, 2 dmg) | once per 1 s; shrug-off capped at 40% overall |
| Temporal Echo | Time + Void | A graze shot repeats 0.35 s later at half damage | once per 0.4 s; echoes never echo |
| Celestial Harvest | Cosmic + Nature | Every 25 embers, +1 heart | once per 20 s; grants no XP |
| Titan's Judgment | Titan + Hunter | Every 2 hits taken or shrugged off: golden 170 px counterblast (6 dmg) | once per 6 s |
| Celestial Barrage | Arcane + Void + Hunter | Every 3.5 s, 4 homing star bolts that pierce 3 and can crit | 4 bolts |

Orbit-blade damage is now per second (24 × blade damage), not per frame, so it
is the same on every phone and no longer rolls a crit every frame.

## 9. Progression & cosmetics

Saved to `localStorage`, surfaced on the Progress screen.

**12 achievements:** First Flight, Heatwave (25 combo), Inferno (10k score),
Endurance (2 min), Ashborn Slayer, Ascendant (level 10), Ember Hoarder (500
lifetime embers), Burst Master (10 bursts in a run), Untouchable (60 s clean),
Flawless Rising (90 s hitless), Legend Forged (take a legendary), Exterminator
(1,000 lifetime kills).

**6 phoenix palettes**, purely cosmetic — they tint the body, glow, trail and
burst, and change no gameplay number:

| Palette | Unlock |
|---|---|
| Ember | Default |
| Azure Ghost | Score 5,000 in a run |
| Violet Ash | Survive 120 s |
| Molten Gold | Bank 750 lifetime embers |
| Verdant Flame | Defeat the Ashborn |
| Spectral White | Earn 6 achievements |

Unlocks are re-derived from lifetime stats on every load, so an unlock added in a
future version appears retroactively rather than being lost.

## 10. Feel

The things that make it read as *good* rather than merely functional:

- **Slow motion** on bursts (0.35× for 0.42 s), boss death (0.30× for 0.9 s) and
  player death (0.25× for 1.1 s).
- **Chromatic-aberration flashes** on major impacts — two offset additive
  full-screen tints snapping back, no shader required.
- **Screen shake** used sparingly: damage, bursts, elite deaths, boss beats.
- **Rising pickup pitch** — collection walks up a pentatonic scale as the combo
  climbs, so a long streak literally sounds like a melody.
- **Near-miss audio** rises with combo; the ambient volcanic drone tightens when
  a boss is alive.
- **Edge markers** point at off-screen threats so nothing kills you unseen.
- **Instant restart** — one button, no loading, no confirmation.

## 11. Tutorial

First run only, four beats, each satisfied by doing rather than reading, each
with a hard timeout so the whole thing is over inside ~20 seconds:

1. *Drag anywhere* — until you have moved 260 px (6 s cap).
2. *Collect ember shards* — until 2 shards (6 s cap).
3. *Fly close to danger* — until the first near-miss (6 s cap).
4. *Release to burst* — appears only once the meter is full (8 s cap).

It never blocks play; it is a hint strip above the thumb area, and it is marked
seen once the first run ends.
