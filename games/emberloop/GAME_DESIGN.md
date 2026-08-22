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
| Hold | Charge the Phoenix Burst meter (faster while moving; near-misses and kills add extra). |
| Release | **Fire the Phoenix Burst** if a charge is stored. |
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

**Readability rules:** every committed attack has a telegraph you can see before
it lands; the telegraph line shows exactly where the attack will go; each
archetype has a distinct silhouette *and* a distinct colour, so threat type is
legible at a glance in a crowded arena.

### The Ashborn (boss)

**Wakes at 1:20, and returns every 1:40** thereafter with +45% HP per encounter.
A three-second warning (audio sting, screen flash, toast) precedes it.

The first encounter used to sit at 2:50, which meant most runs ended without ever
meeting the headline fight — a poor reason to stop playing. It now lands inside a
typical run, and each cycle is announced as a named **Phase** so progress through
a run is legible rather than an undifferentiated stream of enemies.

| Stage | Behaviour |
|---|---|
| 1 | Drifts on a slow circular path, firing 14-bullet radial crowns every 2.4 s. |
| 2 | Traces a figure-eight (Lissajous 1:2) while spraying a 3-armed rotating spiral, and summons cinders. |
| 3 | Stalks you, telegraphs a heavy charge for 0.85 s, slams, then erupts a 20-bullet ring at the impact point. |

Between stages it is briefly invulnerable while it re-forms: the screen clears of
bullets, six shards drop and you get 10 XP. That beat is deliberate breathing
room, not dead time.

**Felling one pays properly** — 1,500 score, 40 shards, 24 XP, and **+1 health**.
Without a reward that size there is no reason to fight a boss rather than kite it
until it leaves, and "the fight is optional and unrewarding" is how a survival
game loses its spine.

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
- **Burst energy** from movement (14/s at speed), idling (3.5/s), near-misses (7)
  and kills (2.2).

## 8. Upgrades

21 upgrades across three families and three rarities. Draw weights are
common 100 / rare 32 / legendary 7, with non-commons scaled by `1 + level/25` so
late runs see rarer cards. A card already at max level is never offered, and the
three cards in a draft are always distinct.

### Offense
| Upgrade | Rarity | Max | Effect |
|---|---|---|---|
| Emberblades | Common | 4 | +1 orbiting fire blade |
| White-Hot Edge | Rare | 3 | Blades deal +1 damage and orbit wider/faster |
| Chain Lightning | Rare | 3 | Damage arcs to +1 nearby enemy (and +0.5 arc damage after L1) |
| Critical Bloom | Common | 4 | +12% chance hits detonate in a fire bloom |
| Homing Embers | Common | 4 | +1 auto-fired seeking ember, faster volleys |
| Solar Detonation | Rare | 3 | Burst +60% damage, +20% radius |
| Magma Wake | Rare | 3 | Burning trail, +2.5 damage/sec |
| Ashfall Doctrine | **Legendary** | 1 | +18% crit, +2 chain targets, kills throw 3 shrapnel embers |

### Defense
| Upgrade | Rarity | Max | Effect |
|---|---|---|---|
| Cinder Shield | Common | 3 | Absorbs one hit; recharge 14 s → 11 s → 8 s |
| Ashen Grace | Common | 3 | +0.5 s invulnerability after a hit |
| Mirror Flame | Rare | 3 | +25% chance to reflect enemy bullets back as yours |
| Flame Armor | Rare | 3 | +15% chance to ignore damage entirely |
| Second Dawn | **Legendary** | 2 | A lethal hit is survived at 1 HP instead |

### Utility
| Upgrade | Rarity | Max | Effect |
|---|---|---|---|
| Ember Draw | Common | 4 | +45% pickup radius |
| Updraft | Common | 4 | +12% movement speed |
| Rising Insight | Common | 4 | +25% XP |
| Long Burn | Common | 3 | +30% combo duration |
| Heavy Air | Rare | 3 | Enemy bullets 18% slower (multiplicative) |
| Brinkwalker | Rare | 3 | +60% near-miss Heat, score and burst energy |
| Molten Fortune | Rare | 3 | +40% shard score and currency |
| Twin Phoenix | **Legendary** | 1 | A second stored Phoenix Burst charge |

Stacking is intentional and visible: Emberblades adds real orbiting sprites,
Magma Wake paints a trail, Cinder Shield draws a ring, Twin Phoenix adds a HUD
charge pip. All levels fold into one stat block via `computeStats()`.

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
