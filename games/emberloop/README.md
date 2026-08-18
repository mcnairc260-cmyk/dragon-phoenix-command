# EMBERLOOP

A fast, mobile-first survival game for the browser. You are a phoenix in a
collapsing volcanic caldera: **drag anywhere to fly, graze danger to build Heat,
release to unleash the Phoenix Burst.** Runs are short, restarts are instant, and
every level-up hands you a choice between three upgrades.

Built with Vite + TypeScript + Phaser 3. No backend, no login, no external
assets — every sprite, particle and sound is generated procedurally at runtime.

Part of the **Dragon Phoenix Ascension** repo. It is a self-contained sub-app
under `games/emberloop/`; the root site remains vanilla, zero-dependency HTML/JS
and is unaffected by anything here.

---

## Quick start

```bash
cd games/emberloop
npm install
npm run dev          # http://localhost:5173
```

Then open it and tap. That is the whole onboarding.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR, exposed on the LAN (`--host`) for phone testing |
| `npm run build` | Type-check (`tsc -b`) then produce a production bundle in `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run typecheck` | Strict TypeScript check, no emit |
| `npm test` | Vitest unit suite (scoring, difficulty, upgrades, progression) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run icons` | Regenerate the PWA icon set from `scripts/make-icons.mjs` |

## Testing on a real phone

The dev server binds to all interfaces, so:

1. Put the phone and the computer on the same Wi-Fi.
2. Run `npm run dev` and note the **Network** URL Vite prints (e.g.
   `http://192.168.1.24:5173`).
3. Open that URL on the phone.

Notes:

- **Audio needs a tap.** Mobile browsers block audio until a user gesture; the
  `AudioContext` is created on the first touch, by design.
- **Haptics** use `navigator.vibrate`, which iOS Safari does not implement. The
  toggle stays available and simply does nothing there.
- **Add to Home Screen** gives the full-screen PWA experience (no browser
  chrome, correct safe-area handling). Install prompts require HTTPS, so use
  `npx vite preview --host` behind a tunnel (e.g. `cloudflared`, `ngrok`) if you
  want to test installability rather than just gameplay.
- For an accurate viewport, prefer Home Screen mode over Safari tabs — the URL
  bar changes `innerHeight` while scrolling, and the game re-layouts on resize.

### Debug mode

Append `?debug=1` to the URL for an FPS counter (top-right) and a
`window.__EMBERLOOP__` bridge exposing `{ game, session }` for inspection. Dev
builds enable it automatically. It is off in production builds unless asked for.

## Deployment

The build is fully static and uses **relative asset paths** (`base: './'`), so
`dist/` can be dropped anywhere — a sub-path, a CDN, or a static host — without
configuration.

**On this repo's Vercel deployment**, the root site is a zero-build static site
and Vercel deploys it as-is, so the game is *not* built by the root deployment.
The game therefore lives in its own Vercel project.

**Current setup** (founder-authorized 2026-08-16): a second Vercel project named
**`emberloop`** is linked to this repository with **Root Directory
`games/emberloop`**. Vercel's Vite preset runs `npm install` + `npm run build`
and serves `dist/`. The root site's zero-build setup is untouched, and the two
projects deploy independently.

Its **production branch is `main`**, so the game only reaches the production URL
once `games/emberloop/` exists on `main`. Until then every push to a feature
branch produces a working **preview** deployment, which is what the branch URL
below serves. Promoting it to production means merging the branch — a founder
call, not a deployment detail.

The rejected alternative, recorded so it is not relitigated: adding a build step
to the *root* project (`cd games/emberloop && npm ci && npm run build`). That
converts the root deploy from "no build" to "build" for the whole site, which
`docs/AI_ONBOARDING.md` §3 reserves for the founder.

The game needs no environment variables, secrets, or serverless functions.

## Project structure

```
games/emberloop/
├── index.html                  # Shell: canvas mount + DOM overlay layer
├── public/
│   ├── manifest.webmanifest    # PWA manifest (portrait, standalone)
│   ├── sw.js                   # Offline cache: precache shell, cache-first runtime
│   └── icons/                  # Generated PNG/SVG icon set
├── scripts/make-icons.mjs      # Procedural icon generator (pure Node, no deps)
└── src/
    ├── main.ts                 # Entry: viewport sizing, gesture blocking, Phaser boot
    ├── style.css               # DOM overlay styling; all colours are CSS variables
    ├── config/GameConfig.ts    # Every tuning constant lives here
    ├── core/                   # Maths, seedable RNG, object pool, viewport, safe area
    ├── effects/                # Procedural textures, particles/shake/flashes, the arena
    ├── entities/               # Player, Enemy, Boss, Projectile, Pickup
    ├── systems/                # Scoring, difficulty, levelling, progression, audio,
    │                           # haptics, achievements, cosmetics, tutorial
    ├── ui/                     # Canvas HUD + DOM panels
    ├── upgrades/               # Upgrade catalogue, stat folding, rarity draft
    └── scenes/                 # Boot, Title, Game
```

**The split that matters:** anything in `systems/`, `upgrades/` and `core/` is
pure TypeScript with no Phaser import, which is why it is unit-tested directly.
Phaser only appears in `entities/`, `effects/`, `scenes/`, `ui/Hud.ts` and
`main.ts`.

## Design notes

- **Everything is procedural.** Textures are drawn with Phaser `Graphics` and
  canvas gradients at boot (`effects/Textures.ts`); audio is synthesised from
  oscillators and a noise buffer (`systems/AudioEngine.ts`). No third-party art
  or sound ships with the game, so there are no licences to track.
- **The arena is a circle rendered as an ellipse.** Gameplay maths uses a
  normalised radius where `1.0` is the wall, so angular wedges, orbits and radial
  spawns behave circularly while the caldera fills a tall portrait screen.
- **Retina rendering.** The canvas backing store runs at `min(devicePixelRatio, 2)`
  and the camera is zoomed to match, so gameplay code stays in CSS-pixel space
  (`core/viewport.ts`). Use `viewSize(scene)` and `pointer.worldX/worldY`, never
  `scene.scale.width` or `pointer.x`.
- **HUD on canvas, menus in the DOM.** The HUD shares the game's shake and
  slow-motion; the menus get crisp text, real buttons and correct touch targets.
- **Pooling.** Enemies, projectiles, pickups and trail sprites are recycled
  through `core/ObjectPool.ts` so a long run does not thrash the GC.

See [`GAME_DESIGN.md`](./GAME_DESIGN.md) for scoring, difficulty scaling, the
enemy roster and the full upgrade list.

## Accessibility & mobile behaviour

- Reduced-motion toggle (pause menu) softens shake, flashes, slow-motion and
  ambient animation; the OS `prefers-reduced-motion` setting is also honoured for
  the DOM layer.
- Sound, music and haptics toggle independently and persist.
- Touch targets are ≥ 48 px; safe-area insets are measured and respected.
- Page scrolling, pull-to-refresh, text selection, pinch-zoom and double-tap zoom
  are all disabled during play.
- Landscape on a phone shows a "rotate to portrait" overlay rather than a broken
  layout. Desktop landscape gets a centred portrait frame instead.

## Saved data

Progression lives in `localStorage` under `emberloop.save.v1`: high score,
longest survival, best combo, total embers, total kills, runs, bosses defeated,
achievements, unlocked palettes, selected palette, tutorial state and settings.
A corrupt or partial save is repaired field-by-field rather than discarded, and a
missing/blocked `localStorage` (private mode) degrades to an in-memory session
instead of failing.

To wipe progress: `localStorage.removeItem('emberloop.save.v1')`.
