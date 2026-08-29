# BREAKPOINT

A physics-first 3D pool game. Phase 1 is a **playable vertical slice**: one
table, one rack, and the full shot loop — aim, spin, power, strike, watch,
shoot again — on a deterministic 120 Hz simulation.

Part of the Dragon Phoenix Ascension ecosystem, and the third founder-approved
sub-app with its own toolchain (after `opportunity-radar` and
`games/emberloop`). The root site stays vanilla and zero-dependency.

## Run it

```bash
npm install
npm run dev        # http://localhost:5174
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server, exposed on the LAN so a phone can load it |
| `npm run build` | Type-check then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run test` | Vitest, headless, no DOM needed |
| `npm run lint` | ESLint |

All five run in CI on any push or pull request touching `games/breakpoint/**`
(`.github/workflows/breakpoint.yml`). The rest of the repository has no CI and
is unaffected.

## Controls

Mouse and touch run through one input model — there is no separate desktop
path.

| Gesture | Effect |
|---|---|
| Drag the table sideways | Rotate aim |
| Drag the table up/down | Raise or lower the camera |
| Tap the table | Aim at that point |
| Wheel / pinch | Zoom |
| Drag on the **cue ball widget** (bottom left) | Place the cue tip: follow, draw, English |
| Pull **down** on the cue pad (bottom right), then release | Load power and shoot |
| Pull back and return to the start | Cancel the shot |

Controls are locked while the balls are moving. That lock lives in
`ShotSystem`, not in the UI, so no input path can bypass it.

## Architecture

```
src/
├── physics/          the simulation — no DOM, no three.js, fully testable
│   ├── PhysicsConstants.ts   every physical constant, SI units
│   ├── Vec.ts                vector maths
│   ├── TableGeometry.ts      cushions, jaws, pockets as data
│   ├── BallBody.ts           one ball's state; cloth contact velocity
│   ├── FrictionModel.ts      sliding, sliding→rolling, rolling, spin decay
│   ├── SpinModel.ts          cue strike → linear + angular velocity
│   ├── BallCollision.ts      continuous detection, impulse + throw
│   ├── RailCollision.ts      cushion contact above centre, jaws
│   ├── PocketPhysics.ts      capture
│   └── PhysicsWorld.ts       fixed-step integrator with in-step CCD
├── core/FixedStepDriver.ts   the only bridge from frames to simulation steps
├── game/             rules-free shot loop
│   ├── Rack.ts               the opening position
│   ├── ShotRecord.ts         the replayable record of one shot
│   ├── ShotSystem.ts         AIM → SPIN → POWER → STRIKE → WATCH → NEXT
│   └── AimPredictor.ts       aiming line, ghost ball, tangent line
├── render/           three.js; reads the world, never writes to it
├── input/            PointerControls — one path for mouse, touch and pen
├── audio/            procedural WebAudio, intensity driven by real impulses
└── ui/               DOM overlay
```

Two invariants hold the whole thing up, and each has a regression test:

1. **Rendering cannot change physics outcomes.** The renderer only reads.
2. **Frame rate cannot change physics outcomes.** `FixedStepDriver` spends
   wall-clock time in whole 1/120 s steps, so 30 fps and 144 fps produce
   identical tables.

## The physics

The model is the standard one for pocket billiards (Alciatore's technical
proofs; Marlow, *The Physics of Pocket Billiards*), in SI units, with the cloth
as z = 0 and +z up.

- **Cloth.** Two regimes chosen by whether the contact patch
  `u = v + ω × (0,0,−R)` is slipping. Sliding applies `a = −μₛg·û` and the
  matching torque, so draw turns into follow on its own. Rolling applies
  rolling resistance and holds ω on the rolling constraint. ωz (English) decays
  separately through drilling friction, which is why side spin outlives the
  roll.
- **Cue strike.** Tip offset `(a, b)` in ball radii gives
  `Δω = (5v₀/2R)·(a·ẑ − b·ŝ)`. At `b = 0.4` that is exactly natural roll, which
  the test suite asserts rather than assumes.
- **Ball–ball.** Continuous time-of-impact, a normal impulse with restitution,
  and a Coulomb-limited tangential impulse — the source of throw and of spin
  transfer between balls.
- **Cushions.** The nose sits at 1.27 R, *above* the ball's centre, so the
  contact point is offset. The normal impulse therefore torques the ball
  forward (a ball leaves a rail with more topspin than it arrived with) and ωz
  produces a tangential friction impulse along the rail (running and reverse
  English change the rebound angle). Resolution uses the rigid-body contact
  impulse `J = −(1+e)·v_contact·n̂ / K`, which cannot increase energy.
- **Pockets.** Capture is only a proximity test against a point set back in the
  throat. Rattling and rejection come from the jaw circles, not from special
  cases — a ball rejects because it genuinely clipped a jaw.
- **Integration.** Fixed 1/120 s steps, each subdivided at the earliest
  contact. At break speed a ball covers ~10 cm per step, nearly two diameters,
  so cutting the step at the contact makes tunnelling impossible rather than
  unlikely.

Nothing in the model uses randomness. Identical inputs give identical outputs.

## Shot records

Every committed shot produces a plain-data `ShotRecord`: pre- and post-shot ball
states, cue ball position, aim angle, power, tip contact point, the generated
impulse, the full event stream, balls pocketed, rail contacts, first object-ball
contact, scratch flag, duration and step count.

Because the simulation is deterministic, the pre-shot state plus the strike is
enough to reproduce the rest exactly — which is what makes the record the
foundation for rules, AI, replay, trick shots and multiplayer sync later.
`ShotSystem.test.ts` asserts the round trip.

## Validation status

**Phase 1 independently validated and hardened on 2026-08-29** (commit
`44b6d0f` as the starting point). The pass re-ran the whole suite from a clean
`npm ci`, audited the physics against closed-form results rather than against
the implementation's own output, stress-tested the break across a swept
parameter space, and drove the real production build in a browser at three
viewports.

| Check | Result |
|---|---|
| Automated tests | **122 passed**, 5 files, ~19 s |
| Typecheck (`tsc -b --noEmit`) | clean |
| Lint (`eslint .`) | clean, no exceptions |
| Production build | clean, 598 kB / 158 kB gzipped |
| Browser checks | **63 passed**, 0 failed, across 3 viewports |
| Physics throughput | 116× realtime (~72 µs per 120 Hz step) |
| Real-device testing | **not performed** — see below |

Browser environment: Chromium 1194 (Playwright) under SwiftShader software
rendering. Viewports: 1280×800 desktop, 390×844 and 430×932 with touch and
`deviceScaleFactor: 3`, each also flipped to landscape mid-shot.

### Defects found and fixed during validation

1. **Simultaneous contacts were resolved sequentially.** A cue ball splitting a
   frozen pair dead centre came off with 0.47 m/s of transverse velocity out of
   a perfectly symmetric shot, the two object balls left at speeds differing by
   48%, and swapping which ball was stored first flipped the result — physics
   that depended on array order. A rack is full of frozen pairs, so this fired
   on every break. Contacts occurring at the same instant are now solved
   together, and the result matches the closed-form elastic solution for a
   symmetric two-contact impact.
2. **Balls could escape the table.** A 24 mm band of entry angles at each corner
   threaded the mouth, missing both jaws *and* the capture point, and there was
   nothing beyond the mouth to stop them: the ball sailed off the table and came
   to rest in mid-air. Containment is now closed by the rule the cushions
   already imply — a centre outside the cushion rectangle can only have gone
   through a pocket mouth. Rattling out is unaffected (165 of 576 swept corner
   approaches still reject).
3. **The visual control lock never applied.** The `is-locked` class went on the
   container rather than the `.hud` element the CSS targets, so during a shot the
   pads never dimmed and — worse — kept their `pointer-events` and went on
   swallowing touches.
4. **The overview camera did not fit a phone.** three.js states `fov`
   vertically, so on a portrait viewport the horizontal field collapsed and the
   watch camera showed a patch of cloth: the player could not see the shot they
   had just played. The framing is now solved from the viewport, and the table is
   turned to lie along the long axis of the screen.
5. **The pendant lamp occluded the table** from the newly-correct overhead
   framing, drawing a black slab across the cloth. It now hides once the camera
   climbs above it.
6. **Latent GPU and memory leaks.** Re-racking removed ball meshes from the
   scene without disposing their geometries, materials or shadow texture; and
   shot history grew without bound at roughly 12 kB per shot. Both are fixed —
   history is capped while every record is still delivered to `onShotComplete`.

### Verified, and found correct

Determinism and replay; frame-rate independence at 30/60/75/120/144/240 fps and
under jittering frames; head-on, angled, glancing and stationary-target
collisions; the 90° rule; momentum conservation across a batch-resolved contact;
sliding, the transition to rolling, rolling resistance against the closed-form
stopping distance, spin decay and stable rest; draw, follow, stun and both
English directions as physical effects; cushion rebound and spin-dependent
cushion response; corner and side capture from 0.25 to 12 m/s; pocket rejection;
tunnelling resistance at break speed; and 24 swept break shots settling with
no energy created, no NaN, no escapes and no overlapping balls at rest.

Two behaviours were investigated and found **correct, not defective**: a ball
rolled at 0.35 m/s from half a metre away stops short of the pocket rather than
being drawn in (pockets are not vacuums), and a ball's net displacement is much
shorter than its path length because each cushion contact removes most of its
linear energy.

### Real-device status

**No testing on physical hardware has been done.** The browser validation ran
under SwiftShader software rendering, which proves correctness, layout and
interaction but says nothing about frame rate. The 60 fps target on a real
phone GPU is unverified.

## Not in Phase 1

Deliberately out of scope: rules and win conditions, multiplayer, progression,
accounts, cosmetics, monetisation, menus. Scratches respot the cue ball behind
the head string, which is the minimum that keeps the table playable — ball in
hand belongs with the rules engine.

## Known limitations

- Balls never leave the cloth. There are no jumps, masse or curve from an
  elevated cue: the cue is always horizontal and vertical velocity is projected
  out at cushion contact. That projection is dissipative, so it cannot create
  energy, but a genuinely airborne ball is not modelled.
- Cushion restitution is a constant. Real cushions are noticeably less elastic
  at high speed.
- The aiming line is a straight geometric cast. It deliberately ignores curve,
  throw and spin, so it shows what a player could read off the table rather
  than the simulated answer.
- The rack is a fixed eight-ball layout with no randomisation, so every break
  from the same shot parameters is identical. That is a determinism feature
  now and will need a seeded jitter once there are rules.
- No PWA/service worker yet (EMBERLOOP has one; this does not).
- Frame rate on real hardware is unmeasured; see the validation status above.
- Simultaneous contacts are solved by relaxation to the inelastic answer and
  then scaled by (1 + e), which is exact for a symmetric impact but an
  approximation for a general multi-contact pile-up. A batch that would create
  energy falls back to sequential resolution, so the no-energy-created
  guarantee holds either way.
