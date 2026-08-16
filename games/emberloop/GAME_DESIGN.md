# EMBERLOOP — Game Design

The one-line pitch: **fly a phoenix around a collapsing volcanic caldera, get as
close to death as you dare, and cash the risk in as score.**

Every number quoted here lives in `src/config/GameConfig.ts`. If a value in this
document and a value in that file disagree, the file is right.

---

## 1. The loop

1. Tap once from the title — you are already flying.
2. Drag anywhere; the phoenix moves toward your finger with slight momentum.
3. Sweep up **ember shards** (score + currency + XP).
4. Pass *close* to enemies and bullets to bank **Heat**, which raises the score
   multiplier.
5. Level up → the game pauses and offers **three upgrade cards**; pick one.
6. Difficulty rises with the clock *and* with your level.
7. Elites arrive every 3 levels; **THE ASHBORN** wakes at 2:50.
8. Three hits and the run ends. Results screen → **one tap to run again.**

The core tension: Heat only comes from being near things that kill you, and a
single hit wipes the whole combo.

## 2. Controls

| Input | Effect |
|---|---|
| Press and drag anywhere | Fly toward the pointer. Speed ramps with distance, hitting full speed ~90 px out, so small nudges give fine control. |
| Hold | Charge the Phoenix Burst meter (faster while moving; near-misses and kills add extra). |
| Release | **Fire the Phoenix Burst** if a charge is stored. |
| Pause button (top-right) | Pause + settings. |
| Desktop extras | Space = burst, Esc/P = pause. |

You never need a finger on the phoenix itself — it flies to the pointer, so your
hand never covers the character.

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

Everything derives from one number:

```
threat = (elapsed_seconds / 60) + (player_level - 1) × 0.34
```

Time and level both feed it, so a player who collects aggressively pulls the
pressure forward: the game keeps pace with skill, not just the clock.

| Derived value | Formula | Range |
|---|---|---|
| Spawn interval | `1.45 × 0.87^threat` | 1.45 s → 0.30 s floor |
| Enemy speed | `1 + threat × 0.085` | 1× → 2.15× cap |
| Enemy HP | `1 + floor(threat) × 0.34` | steps in whole numbers |
| Max live enemies | `6 + threat × 2.2` | 6 → 32 cap |
| Arena collapse interval | `22 − threat × 2.2` | 22 s → 8 s floor |

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

**Levelling.** XP to reach the next level is `round(9 × 1.24^(n-1) + (n-1) × 3)`
— 9 XP for the first level-up, so the first upgrade choice reliably lands inside
the opening ~15–25 seconds. Shards and kills give 1 XP; elites 6; boss stages 10.

**Elites** spawn on every 3rd level: a normal archetype with ~9× HP, 1.9× size,
0.8× speed, a crown marker, a health bar and a 10-shard payout.

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

Wakes at **2:50** and returns every 2:30 after that, with +45% HP per encounter.
A three-second warning (audio sting, screen flash, toast) precedes it.

| Stage | Behaviour |
|---|---|
| 1 | Drifts on a slow circular path, firing 14-bullet radial crowns every 2.4 s. |
| 2 | Traces a figure-eight (Lissajous 1:2) while spraying a 3-armed rotating spiral, and summons cinders. |
| 3 | Stalks you, telegraphs a heavy charge for 0.85 s, slams, then erupts a 20-bullet ring at the impact point. |

Between stages it is briefly invulnerable while it re-forms: the screen clears of
bullets, six shards drop and you get 10 XP. That beat is deliberate breathing
room, not dead time.

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
