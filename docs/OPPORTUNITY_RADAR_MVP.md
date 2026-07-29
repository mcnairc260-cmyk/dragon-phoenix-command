# OPPORTUNITY RADAR — MVP DOCUMENT

**Version 1.0 (2026-07-29).** Product definition and engineering record for the Opportunity Radar MVP (`opportunity-radar/` in this repo). Companion to `opportunity-radar/README.md` (setup/architecture) — this file covers product intent, methodology, and roadmap.

---

## 1. Product promise

> Opportunity Radar helps entrepreneurs discover high-potential opportunities before they become obvious to everyone else.

Positioning: **"Your AI Opportunity Intelligence Platform."** Supporting line: *"See tomorrow's markets today."*

The promise is delivered honestly or not at all: every opportunity separates verified data from AI interpretation, estimates, and predictions, and the MVP labels 100% of its content as demonstration data. This mirrors the DPA Constitution's integrity mandate (no unverifiable claims, no hype) — the product must earn "intelligence platform" rather than perform it.

## 2. Target users

Entrepreneurs, freelancers, creators, investors, and ambitious professionals who want to enter markets early. The MVP's fit model (budget, experience, risk tolerance, preferred industries) exists so the same radar serves a $0-budget freelancer and a $25k-budget operator differently.

## 3. MVP scope (shipped)

- Marketing landing page (promise, how-it-works, examples, score explainer, labeled placeholder testimonials, pricing preview, DPA attribution)
- Dashboard: personalized greeting, search, 9 filters, 6 sorts, category nav, emerging signals, recently viewed, recommended-for-you, opportunity feed
- Opportunity cards (title, description, category, score, growth, competition, cost, difficulty, window, confidence, save, link)
- Detail pages: executive summary, Why Now + signals, score breakdown, competition/risks, revenue models, strategic + 7-day + 30-day plans, related opportunities, save/share, disabled export
- Opportunity Score (§5) with visible components and bands
- Saved opportunities (localStorage, swappable store)
- Settings (profile, interests, budget/experience/risk, notifications, subscription, appearance incl. reduced motion, privacy incl. clear-data)
- Auth-ready login/signup wired to an honest adapter (§8)
- Pricing page, 3 tiers, placeholder prices (§7)
- Loading/empty/error/success states, mobile+desktop responsive, WCAG-minded components
- 41 automated tests (score, filters, sorting, saved state, route rendering, dashboard interactions)

## 4. Features intentionally deferred

Future phases, not stubs: mobile native app, browser extension, community/marketplace/social features, complex team collaboration, public API, automated scraping infrastructure, real-time alerts, AI business coach, investment recommendations, automated financial projections, enterprise admin, white-label. Rationale: solo-founder capacity (Continuation Protocol Gate 6) and "validate quickly" (Blueprint).

## 5. Opportunity Score methodology

`score = round(Σ component × weight)`, components 0–100, implemented in `opportunity-radar/src/lib/score.ts` (pure, typed, tested):

| Factor | Weight |
|---|---|
| Market growth | 25% |
| Competition advantage | 20% |
| Revenue potential | 20% |
| Timing & urgency | 15% |
| Ease of execution | 10% |
| Data confidence | 10% |

Bands: 90–100 Exceptional · 80–89 Strong · 70–79 Promising · 60–69 Watch · <60 Early/Uncertain.

Principles: weights are public; every component is shown to the user; scores round to integers (no fake precision); demo-derived scores are labeled "demo"; seed records never hand-set `score` — it is always computed from components (enforced by test).

## 6. Demo-data limitations

The 12 seed opportunities are **written to exercise the product**, not researched market intelligence. Their signals are marked `evidence: 'estimate'` with explicit "demo signal — unverified" source notes. `sourceStatus: 'demo'` and `isDemo: true` are set on every record, surfaced as badges throughout the UI, and disclaimed in the footer. Nothing may be re-labeled `verified` without a human-checked citation (same verify-before-render obligation as YouTube content, PROJECT_CONTEXT §9).

## 7. Monetization structure

Three tiers (placeholder pricing, labeled as such in the UI): **Free** ($0 — limited feed, basic filters, 5 saves, summaries), **Pro** ($29/mo — full database, advanced filters, score breakdowns, alerts, unlimited saves, action plans), **Founder** ($99/mo — team workspace, shared collections, exports, early-signal alerts, priority features).

**Stripe integration plan** (not built; nothing fake shipped):
1. Products/prices defined in Stripe dashboard; IDs in serverless env vars.
2. Serverless endpoints in the repo's existing `api/` pattern: `api/checkout.js` (create Checkout Session), `api/billing-portal.js`, `api/stripe-webhook.js` (subscription lifecycle → user record).
3. Client uses only `VITE_STRIPE_PUBLISHABLE_KEY`; secret key stays server-side (repo rule: secrets only in `api/*`).
4. Entitlement checks read the user's tier from the auth-backed profile; the current `PricingCard` CTAs (waitlist → signup) swap to Checkout links.
5. Prerequisite: authentication (§8) must land first; billing without accounts is impossible.

## 8. Authentication integration plan

`opportunity-radar/src/auth/authAdapter.ts` defines `AuthAdapter` (isConfigured / getCurrentUser / signIn / signUp / signOut). The shipped `UnconfiguredAuthAdapter` reports auth as unavailable and the login/signup UI says so plainly. To integrate (provider choice is a founder decision — candidates: Supabase, Clerk, Auth.js):
1. Implement the interface in a new adapter class; keep all SDK calls inside it.
2. Add provider keys to `.env` (template in `.env.example`).
3. Swap the `auth` export; add a session context + route guards for account-only features.
4. Migrate `SavedStore`/`PreferencesStore` to account-backed implementations (interfaces already in place).

## 9. Future data strategy (live signal pipeline — documented, not built)

Candidate sources: Google Trends, public Reddit data, Product Hunt, GitHub, Hacker News, public job postings, funding announcements, government datasets, industry news, search-demand providers.

Architecture (in dependency order): **source adapters** (one per source, own rate-limit handling and citation capture) → **normalization** into a common Signal schema → **deduplication** → **signal scoring** (strength/recency) → **confidence scoring** → **opportunity clustering** (signals → opportunity candidates) → **human review** (nothing publishes as more than an estimate without it — Constitution integrity rule) → **source citations** rendered in the UI → **refresh scheduling**. Each stage feeds the existing `sourceStatus` ladder: `demo → ai-estimate → human-reviewed → verified`.

Hard constraints: legal/ToS review per source **before** any collection; no scraping in violation of terms; rate limits respected; no personal data ingestion. The MVP's `OpportunityRepository` interface is the splice point — the UI needs no changes when real data arrives.

## 10. Release checklist (before public launch)

- [ ] Founder review of all copy against Brand Bible pre-publish checklist
- [ ] Founder decision: deployment target (separate Vercel project vs. subpath)
- [ ] Replace placeholder testimonials section or remove it
- [ ] Confirm placeholder pricing or set real pricing
- [ ] Authentication provider chosen and integrated
- [ ] Legal: terms of service, privacy policy, "not investment advice" disclaimer page
- [ ] Accessibility pass with a screen reader
- [ ] Real favicon/OG images from brand key art
- [ ] Analytics decision (currently: none, by policy)
- [ ] Demo-data banner strategy for launch (keep labels until real data exists)

---

## 11. Design system

The approved Google Stitch package (5 screens + `DESIGN.md`) is archived at `opportunity-radar/design/stitch/` and is the visual source of truth. It defines a **light, corporate-minimal** system — Cool Gray canvas, white cards, Deep Professional Blue ink, Star Gold accent, Fresh Emerald for growth, Inter throughout.

This is a **product-scoped exception to DPA's dark-mode-first mandate**, flagged for founder confirmation in `PROJECT_CONTEXT.md` §16a. The root DPA site remains dark and untouched. Because every color is a CSS variable in `src/index.css`, reverting this product to dark is a token change, not a rewrite.

Structural patterns adopted from Stitch: persistent desktop sidebar (Feed / Saved / Plans / Settings) with mobile bottom nav, dashboard stat tiles, the circular "Radar Score" gauge on detail pages, pricing comparison table and FAQ, two-column settings with toggle switches, and the split hero with a radar visualization plus dark conversion band. Accessibility adjustment on top of Stitch: gold is never used as body text (it fails contrast on white) — `--color-gold-ink` carries gold's meaning where text must read.

---

*Verification record (2026-07-29, updated after the Stitch reconciliation): `npm run build` clean · `tsc -b` clean · `eslint src` clean · 41/41 Vitest tests pass · all 8–10 routes exercised headless (Chromium) at 1280px and 375px with search/filter/sort/save flows, no horizontal overflow, and no app console errors.*
