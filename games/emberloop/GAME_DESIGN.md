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
6. The run is a sequence of **boards** (§4): each faction's three enemies for
   a 60 s wave, then its boss, a clean-up beat and a **rest screen**. Six
   boards make a loop; the loop then repeats, a step harder. Levelling never
   makes it harder.
7. One elite per board (two from board 4 and in later loops).
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

## 4. Boards and difficulty

Founder decision (2026-11-21): **each faction's three enemies and its boss are a
single board**, with a rest point after each, and gently rising difficulty.
Tuning: `BOARD` in `src/config/GameConfig.ts`; maths: `src/systems/Difficulty.ts`
(pure, unit-tested); flow: `GameScene.updateBoard`.

| Phase | What happens |
|---|---|
| Intro (2.2 s) | Banner: "Board n of 6: Faction", no spawns |
| Wave (60 s) | That faction's chaser / charger / shooter; orbiters, splitters and mines join as half-weight extras from boards 2, 3 and 4 of loop 1 (all of them from loop 2). Elites at 25 s (and 48 s from board 4 / loop 2). Boss warning 3 s before the end |
| Boss | The faction's boss; ordinary spawns halve |
| Clear (2.2 s) | Remaining enemies and bullets dissolve, every ember flies to the phoenix |
| Rest | Game paused: board cleared, 6-board progress track, score / time / level / kills, hearts, +1 heart, "next: a little harder". Continue starts the next board; after board 6, "Loop complete — Begin loop 2" |

**The run's first board is an on-ramp** (`BOARD.firstBoard`, founder feedback
2026-11-22): chasers only for 15 s, chargers from 15 s, shooters from 30 s,
thinner spawns, enemies 15% slower, longer charger warnings, no arena
collapses, elite at 40 s. Loop 2's first board is not eased.

**Threat** = board × 0.45 + loop × 1.6 + (0 → 0.5 across the wave). Loop 1
spans 0 → 2.75. Loop 2 starts at 1.6 — about board 4 of loop 1, so looping back
is not a wall — and every loop-2 board is harder than its loop-1 twin. Boss HP
×(1 + 0.15 per board + 0.6 per loop); attack pace rises gently the same way.
Threat drives spawn interval, enemy speed, enemy HP, max enemies and arena
collapse cadence through the same formulas as before (floors and caps kept).

Threat is a pure function of (board, seconds into its wave). It never reads
player level: collecting fast is pure upside.

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
ASHBORN (founder decision "3a"). Each boss closes its faction's board (§4):
Magmathar, Criotharis, Nethermorph, Blightbloom, Skyrend, Aurelion, then the
loop repeats. It arrives at the end of the 60 s wave after a three-second named
warning (e.g. "MAGMATHAR — The Core Titan — awakens"), with HP scaled by board
and loop (§4).
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
every number); effects: `src/scenes/SynergyController.ts`, with Molten Armor's
armour folded into `computeStats()` and Infernal Cyclone into `bladeSpec()`.

| Synergy | Shards | Effect | Limit |
|---|---|---|---|
| Firestorm | Ember + Storm | Every 1.6 s a ring of lightning-fire bursts out to 90 px (1.5 dmg, +0.25 per Ember/Storm level past the first), then lightning chains from the farthest enemy caught to 2 more | a pulse, never a standing damage zone |
| Frozen Barrage | Frost + Arcane | 5-shard ice fan at the nearest enemy every 2 s; chilled enemies move 30% slower; 3 hits freeze for 1.2 s | bosses are never frozen |
| Shadow Execution | Void + Hunter | A crit detonates a 90 px void explosion (2 dmg) | once per 0.6 s; raw damage, so it cannot crit again |
| Phoenix Renewal | Nature + Ward | A shield unbroken for 12 s blooms: +1 heart | resets when the shield breaks; never above 3 hearts |
| Thunder Tempest | Storm + Arcane | Every 2.5 s lightning hits the nearest enemy (3 dmg) and jumps 3 times at 70% each | 3 jumps |
| Molten Armor | Ember + Titan | +10% shrug-off chance; whatever hits you is scorched (85 px, 2 dmg) | once per 1 s; shrug-off capped at 40% overall |
| Temporal Echo | Time + Void | A graze shot repeats 0.35 s later at half damage | once per 0.4 s; echoes never echo |
| Celestial Harvest | Cosmic + Nature | Every 25 embers, +1 heart | once per 20 s; grants no XP |
| Titan's Judgment | Titan + Hunter | Every 2 hits taken or shrugged off: golden 170 px counterblast (6 dmg) | once per 6 s |
| Celestial Barrage | Arcane + Void + Hunter | Every 3.5 s, 4 homing star bolts that pierce 3 and can crit | 4 bolts |

**Infernal Cyclone** (Ember Blades + Ember + Storm): blades spin 12% faster and
deal 20% more, with hotter swords, fiercer trails and lightning flickers. The
trails still never deal damage, and the bonus applies once.

Until 2026-11-21 Firestorm summoned orbiting blades. The founder's Ember Blades
brief made the blades their own weapon, so Firestorm became the pulsing
lightning-fire ring its original brief describes (no second blade system).

### Ember Blades (weapon)

An orbital melee weapon, taken from the level-up draft like a shard (no separate
levelling). Tuning: `src/upgrades/EmberBlades.ts`; weapon:
`src/entities/EmberBlades.ts`; sword art cut from `art/ember-blades.png`.

| Level | Swords | Change |
|---|---|---|
| 1 | 1 | Summon one red-hot orbiting blade |
| 2 | 2 | Add a second blade |
| 3 | 3 | Add a third blade |
| 4 | 4 | + rotation speed (2 s → 1.7 s per turn) |
| 5 | 5 | + damage (×1.25) |
| 6 | 6 | + rotation speed (1.4 s per turn) |

- Swords orbit the phoenix's position at 46 px, clockwise on screen, evenly
  spaced (360° / n), gliding to new slots when one is forged in (sparks and a
  molten flash). Edges point along the direction of travel.
- Only the metal hurts: each sword has its own capsule (34 × 10 px), swept in
  ≤ 0.12 rad steps so a fast spin cannot skip an enemy, with a 0.4 s cooldown per
  sword per enemy. 2 damage per hit (bosses take half). Trails, sparks, glows and
  the forging flash are drawn separately and never take part in collision.
- Ember raises blade damage through the normal damage path (once); Hunter crits
  apply; Storm adds +3% spin per level (cap +12%); Time does not change spin.
  Spin can never be faster than 1.1 s per turn.
- Trails are short tapered embers covering at most 35% of the gap to the next
  sword (≤ 50°), so even six blades show clear gaps.


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
