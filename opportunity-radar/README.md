# Opportunity Radar

**Your AI Opportunity Intelligence Platform** — a flagship web application in the Dragon Phoenix Ascension (DPA) ecosystem.

> Opportunity Radar helps entrepreneurs discover high-potential opportunities before they become obvious to everyone else. *See tomorrow's markets today.*

This directory is a self-contained sub-application inside the `dragon-phoenix-command` repo. It does **not** affect the existing site (`/index.html`, `/api`, `/vercel.json`), which deploys unchanged.

## Status: MVP (demo data)

Everything runs on clearly-labeled demonstration data. There is no live signal ingestion, no authentication provider, and no payment processing — the integration points exist and are documented, but nothing is faked. See `../docs/OPPORTUNITY_RADAR_MVP.md` for product scope, scoring methodology, and roadmap.

## Stack

- React 19 + TypeScript (strict) + Vite 6
- Tailwind CSS v4 (design tokens as CSS variables in `src/index.css`)
- React Router 7
- Vitest + Testing Library (41 tests)

Framework adoption was founder-authorized for this sub-app (see repo `CHANGELOG.md` 2026-07-29); the root site remains vanilla/zero-dependency per `docs/AI_ONBOARDING.md` §3.

## Development

```bash
cd opportunity-radar
npm install
npm run dev        # dev server on http://localhost:5173
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc only
npm test           # Vitest (single run); npm run test:watch for watch mode
npm run build:demo # single self-contained HTML in dist-demo/ (see below)
```

**Demo build.** `npm run build:demo` bundles the app into one self-contained
`dist-demo/index.html` — CSS and JS inlined, Cinzel/Inter embedded as base64 —
for static hosts that block external requests (a Claude Artifact, an email
attachment, a USB stick). It builds with `VITE_DEMO_HASH_ROUTER=1`, so that
variant uses hash URLs (`#/dashboard`) since there is no server to rewrite
paths. Production builds are unaffected and keep real paths.

Node 20+ recommended (built and verified on Node 22).

## Architecture

```
design/brand/              # DPA Brand Guide v1.0 — the visual source of truth
design/stitch/             # Google Stitch screens — structural reference only (light palette superseded)
src/
├── types/opportunity.ts   # Domain types — single source of truth
├── lib/
│   ├── score.ts           # Opportunity Score: weights, bands, computeScore()
│   ├── filters.ts         # Pure search/filter/sort/fit functions (tested)
│   ├── saved.ts           # SavedStore interface + localStorage/memory impls
│   ├── preferences.ts     # PreferencesStore interface + localStorage impl
│   └── format.ts          # Display formatting helpers
├── data/
│   ├── opportunities.ts   # 12 demo seed records (isDemo: true, always labeled)
│   └── repository.ts      # OpportunityRepository interface + demo impl
├── auth/authAdapter.ts    # AuthAdapter interface + honest unconfigured impl
├── state/                 # React contexts (saved/preferences/recent/toasts) + data hooks
├── components/            # Reusable UI: cards, badges, filters, states, layouts
└── pages/                 # Landing, Dashboard, Detail, Saved, Pricing, Settings, Auth, 404
```

Three seams isolate the demo layer so it can be replaced without touching the UI:

1. **`OpportunityRepository`** (`src/data/repository.ts`) → swap for an API-backed implementation.
2. **`SavedStore` / `PreferencesStore`** (`src/lib/saved.ts`, `src/lib/preferences.ts`) → swap localStorage for account-backed persistence.
3. **`AuthAdapter`** (`src/auth/authAdapter.ts`) → implement with Supabase/Clerk/Auth.js when a provider is chosen.

## Design

The visual system is **DPA Brand Guide v1.0** (archived at `design/brand/DPA_BRAND_GUIDE_v1.png`) — Opportunity Radar ships inside the Dragon Phoenix Ascension family and uses its branding.

| Token | Hex | Use |
|---|---|---|
| Obsidian Black | `#0B0B0D` | Page background |
| Volcanic Charcoal | `#1A1B1F` | Card surface |
| Ember Orange | `#FF5A1F` | Restrained accent, brand moments |
| Molten Gold | `#F2A93B` | Opportunity accent, primary CTAs |
| Ash Silver | `#D9DDE3` | Primary text |

Typography per the guide: **Cinzel** for headlines and brand statements, **Inter** for UI, body copy, and product interfaces. Usage principles: dark backgrounds, silver metal, *restrained* ember, crisp high-contrast type.

All tokens live in `src/index.css` (`@theme`) — never hard-code a hex in a component. Tokens are labeled either **official** (the five above) or **derived**: mid-tone text greys and a functional `--color-danger` red, which the five-colour palette does not provide but the UI needs for hierarchy and error states. Derived values are AI-proposed and open to founder revision.

Notes for contributors:
- The palette has no cyan or green. Growth/acceleration reads ember, positive/opportunity reads gold, negative reads the derived danger red.
- Icons are the stroke-based set in `src/components/Icon.tsx`, not emoji — emoji carry their own colours and break the metal palette.
- The canonical DPA monogram and phoenix emblem are reserved marks and are **not** reproduced here; the product uses its own radar glyph plus a "Dragon Phoenix Ascension" wordmark endorsement.
- Google Stitch screens in `design/stitch/` remain useful as **structural** reference (sidebar shell, stat tiles, score gauge, comparison table, FAQ, settings layout). Their light palette is superseded — do not pull colour from them.

Focus states, reduced-motion support, semantic HTML, and labeled controls are required in new components.

## Environment variables

None are required to run the demo. `.env.example` lists the placeholders for future auth, Stripe, and API integrations. Never commit `.env`; secret keys (e.g. Stripe secret) belong in serverless functions, never in Vite client env.

## Deployment

Not yet deployed — deploying anything publicly is a founder decision (Continuation Protocol §2 Tier 3). Two options when approved:

1. **Separate Vercel project** (recommended): root directory `opportunity-radar/`, framework preset Vite, build `npm run build`, output `dist/`. Add a SPA rewrite (`/* → /index.html`).
2. **Subpath of the existing site**: requires changes to the root `vercel.json` (build step + rewrites) — touches production config, founder approval required.

## Known limitations

- All data is static demo seed data; "signals" are illustrative, not sourced.
- Auth and billing are integration points only; login/signup honestly report unavailability.
- Saved items / preferences / recently-viewed are per-browser (localStorage).
- "Alerts" and "export report" are labeled as future/Pro features, not functional.
- Dark theme only (per the brand guide); no light theme; no i18n; no analytics (by policy, none added without documentation).
