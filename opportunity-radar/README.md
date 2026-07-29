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
```

Node 20+ recommended (built and verified on Node 22).

## Architecture

```
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

Palette and typography follow the live DPA site surface (void black, ember `#FF4D00`, gold `#FFB347`, cyan `#00E5FF`; Syne + JetBrains Mono). All colors are CSS variables in `src/index.css` — never hard-code a hex in a component. Dark mode is the primary (and currently only) theme. Focus states, reduced-motion support, semantic HTML, and labeled controls are required in new components.

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
- No light theme yet; no i18n; no analytics (by policy, none added without documentation).
