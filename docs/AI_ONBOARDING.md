# AI ONBOARDING MANUAL — DRAGON PHOENIX ASCENSION

**For any AI (or human) contributor who has never seen this project.**
Read this file first. It tells you what to read, in what order, how the system fits together, what the rules are, what's currently in motion, what is *not* your call to make, and how to contribute without breaking anything.

Last updated: 2026-07-07. If you change anything material about the project, update this manual and `docs/PROJECT_CONTEXT.md` — keeping the written record complete is a project value (Constitution, Article XI: "Failures should become documentation. Successes should become systems.").

---

## 0. Orientation in 60 seconds

Dragon Phoenix Ascension (DPA) is a **cognitive intelligence brand and platform**: cinematic, science-informed education about how the mind works (attention, motivation, habits, decisions, AI-as-amplifier), plus systems and software that turn understanding into action. It is being built by a solo founder (Courtney McNair) as three connected surfaces:

1. **YouTube channel** — the discovery engine (content package written, channel not yet launched)
2. **Dragon Phoenix Command** — the website, currently a single-page AI-mentor app on Vercel, destined to become a public "Cognitive Command Center"
3. **The ecosystem** — newsletter, tools, community, digital products (all future)

Your job as a contributor, whatever the task: **strengthen the ecosystem without violating the Constitution.** When in doubt, understanding before optimization, systems before willpower, truth before popularity.

---

## 1. Required reading sequence

Read in exactly this order. Do not skip #1 — every other document derives its authority from it.

| # | Document | Why it's at this position | Read |
|---|---|---|---|
| 1 | `docs/founding/DPA_CONSTITUTION.md` | Supreme law: values, guardrails, brand philosophy, decision frameworks. Everything else must comply with it. | Fully |
| 2 | `docs/founding/DPA_BLUEPRINT.md` | Strategy and architecture: what DPA is/is not, YouTube strategy, website purpose, technical modules. | Fully |
| 3 | `docs/PROJECT_CONTEXT.md` | The handoff: decision log, invented-vs-mandated registry, assumptions, tool intelligence, known risks, founder context. **The most information-dense file in the repo.** | Fully |
| 4 | `brand/BRAND_BIBLE.md` | Execution rules for brand: voice, visual system, vocabulary, guardrails, pre-publish checklist. | Fully |
| 5 | `brand/LORE.md` | The mythology and its usage rules (myth = language, science = content). | Fully |
| 6 | `brand/STORY.md` | Brand narratives at three lengths + story rules. | Skim; fully before writing any narrative content |
| 7 | `youtube/CHANNEL_STRATEGY.md` | Channel positioning, series, video formula, packaging, funnel, launch plan. | Fully before any YouTube work |
| 8 | `youtube/VIDEO_BACKLOG.md` + `youtube/scripts/*` | The 30-video plan and four finished scripts (study script 01 as the format exemplar). | Skim; fully before writing scripts |
| 9 | `youtube/PRODUCTION_ASSETS.md` | Generated media, job IDs, trailer render plan and budget. | Before any media generation |
| 10 | `index.html`, `api/chat.js`, `vercel.json` | The entire codebase (~350 lines). | Fully before any code work |

**Precedence when documents conflict:** Constitution > Blueprint > Brand Bible > everything else. One known conflict already exists (two color palettes — see §6 and §8); do not resolve it yourself.

---

## 2. Architecture

### 2.1 Repository layout

```
dragon-phoenix-command/
├── index.html              # The entire web app UI (single page, no build step)
├── api/chat.js             # Vercel serverless function: proxies Anthropic Messages API
├── vercel.json             # Rewrites "/" → index.html; nothing else
├── package.json            # Metadata only — zero dependencies
├── docs/
│   ├── founding/           # Constitution + Blueprint (source of truth)
│   ├── PROJECT_CONTEXT.md  # Session handoff / decision log
│   └── AI_ONBOARDING.md    # This file
├── brand/                  # Brand bible, story, lore
└── youtube/                # Strategy, backlog, scripts, asset log
```

### 2.2 The web app (current state)

- **Frontend:** one static HTML file. Vanilla JS, inline CSS, Google Fonts (Syne + JetBrains Mono), emoji as icons. No framework, no bundler, no npm packages. Chat UI + quick prompts + "pillar" cards, all driven by three JS arrays (`QUICK`, `PILLARS`, `SYSTEM`).
- **Backend:** one serverless function (`api/chat.js`) that forwards `{messages, system}` to `https://api.anthropic.com/v1/messages` with `ANTHROPIC_API_KEY` from Vercel env vars, returns `{reply}`.
- **Deployment:** Vercel, auto-deploys from GitHub `main`. **Every merge to `main` ships to production immediately.** There is no staging environment, no tests, no CI.
- **Current product identity:** a *personal* AI business mentor for the founder (his profile is hard-coded in the client-side `SYSTEM` prompt). The Blueprint's *public* Cognitive Command Center is the destination; migration is an unresolved decision (§8.2).
- **Known defects** (documented, deliberately not yet fixed — confirm with founder before fixing): model ID `claude-sonnet-4-6` is likely invalid; CORS is `*` with no rate limiting; personal details exposed in page source. See `PROJECT_CONTEXT.md` §7.

### 2.3 The wider ecosystem (per Blueprint + observed tooling)

| Component | Role | Status |
|---|---|---|
| GitHub (this repo) | Version control, single source of truth for docs + code | Active |
| Vercel | Hosting + serverless | Active (auto-deploy from `main`) |
| YouTube | Discovery platform | Not yet launched; full content package ready |
| Higgsfield (MCP) | Image/video/audio generation | Free plan, ~3 credits — see cost/gating intel in `PROJECT_CONTEXT.md` §8 |
| Canva, Descript, Figma, Notion, Google Drive (MCP) | Thumbnails, video editing, design, knowledge base, asset archive | Connected, unused so far |
| n8n | Automation engine (Blueprint) | Not yet set up |

---

## 3. Coding standards

The codebase is intentionally tiny. Match it; don't "professionalize" it uninvited.

1. **No frameworks, no build step, no dependencies** unless the founder approves the change explicitly. The Blueprint's development philosophy is law: *"Never over-engineer. Validate ideas quickly. Keep systems modular."* A React migration, bundler, or `node_modules` tree is a founder-level decision, not a refactor.
2. **Match existing style:** 2-space indent, single quotes avoided in HTML/CSS (existing code uses a compact, pragmatic style — read it and mirror it), terse class names, CSS custom properties in `:root` for all colors, mobile-first responsive (`@media(max-width:560px)`).
3. **All colors via CSS variables.** Never hard-code a hex in a rule; add to `:root` if genuinely new. (Palette itself is contested — §8.1.)
4. **Secrets stay server-side.** Only `api/*` functions may touch `process.env`. Never move the API key, and never commit keys, tokens, or personal data. Note the existing client-side system prompt is a known privacy issue — don't replicate the pattern.
5. **Serverless functions:** keep the existing shape — CORS headers first, OPTIONS preflight, method check, input validation, try/catch with clean JSON errors. One function per concern.
6. **Comments** only for constraints the code can't express (the existing code's comment style: short, practical, occasionally pointing at deploy steps).
7. **No tests exist.** If you add meaningful logic, verify it by actually exercising it (deploy preview or local) and say in the PR how you verified. Don't add a test framework without approval.
8. **Anthropic API specifics:** current model IDs are `claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5-20251001` (as of early 2026 — verify against current docs before hardcoding). The Constitution's AI Charter (Art. IX) values capabilities over brand loyalty; model choices should be swappable.

---

## 4. Design philosophy

From Constitution Art. VIII and Blueprint "Design Language" — these are mandates:

- Interfaces feel like **a command center** — not social media, not corporate software, not generic AI.
- Communicates: confidence, precision, focus, intelligence, transformation, minimalism.
- **Dark mode is the primary experience.** Void-black backgrounds, vibrant fire accents, restrained cyan for data/AI.
- Motion subtle and purposeful (HUD elements resolving, ember drift — never bouncy).
- Typography intentional: display face with character + monospace for HUD labels/data.
- Mobile-first, fast, minimal clutter.
- The complete visual grammar (thumbnail rules, imagery direction, gradient usage) is in `brand/BRAND_BIBLE.md` §5 — but see §8.1 below before using its exact hexes.

For content design (videos, thumbnails, copy): voice is **precise, honest, practical, cinematic, respectful** (BRAND_BIBLE §4); every piece must pass the pre-publish checklist (BRAND_BIBLE §9).

---

## 5. Hard constraints (violating any of these is breaking the system)

These come from the Constitution and are **not negotiable with anyone except the founder amending the Constitution itself:**

1. **Never medical advice.** ADHD/mental-health content is educational and experience-based only, with explicit disclaimers.
2. **Never** fear-based marketing, false urgency, clickbait that misrepresents, false promises, or fake expertise.
3. **Factual claims must be evidence-informed** — and every research claim currently in the scripts is *unverified* (see `PROJECT_CONTEXT.md` §9). Nothing renders or publishes until a human verifies its claims.
4. **AI is an amplifier, never a replacement.** Don't build features that take decisions away from users; don't present AI output as autonomous authority.
5. **Dark-mode-first** unless the founder decides otherwise.
6. **Humans keep the chair:** ethics, strategy, vision, creativity, relationships are the founder's; automation handles repetition.
7. Success is measured by **impact on people's thinking and action** — never optimize for vanity metrics at the expense of the above.

---

## 6. The one live inconsistency you must know about

Two palettes and two font stacks exist (full table in `PROJECT_CONTEXT.md` §6): the **live site** uses ember `#FF4D00` / gold `#FFB347` / cyan `#00E5FF` with **Syne**; the **Brand Bible** proposes `#FF6B2C` / `#FFB300` / `#22D3EE` with Space Grotesk/Sora. Until the founder reconciles them: **match whichever surface you're working in** (site work → site palette; brand-doc/YouTube packaging work → Brand Bible palette) and do not "fix" the other side.

---

## 7. Active priorities (as of 2026-07)

In order (from `PROJECT_CONTEXT.md` §13):

1. **Archive the two generated media assets** (URLs in `youtube/PRODUCTION_ASSETS.md`) before the CDN links expire, and visually QA them (AI-rendered title text never verified).
2. **Launch the YouTube channel shell:** create channel, About text = `brand/STORY.md` medium version, banner from key art (asset queue item 1).
3. **Produce video 01 end-to-end** (`youtube/scripts/01-...md`) as the pipeline pilot — after a human fact-verification pass.
4. **Fix `api/chat.js` model ID** next time the chat app is touched (likely broken now).
5. Full trailer render awaits Higgsfield budget (~70–120 credits + Basic plan; plan in `PRODUCTION_ASSETS.md`).

---

## 8. Unresolved decisions — founder-only territory

Do **not** decide these yourself. If your task collides with one, surface the collision and ask (or route around it):

1. **Palette/typography reconciliation** (§6).
2. **Personal mentor site vs. public platform** — which direction `index.html` evolves; whether the personal mentor moves behind auth.
3. **Origin-story rewrite** — `brand/STORY.md` founder narrative must be personalized with the founder's real biography; only he can supply/approve it.
4. **Lore vocabulary approval** — "Operators," room names, adversaries, ranks are v1 AI proposals (invented-vs-mandated registry: `PROJECT_CONTEXT.md` §4).
5. **Voiceover strategy** — human recording vs. voice clone vs. AI voice.
6. **Higgsfield spend** — any generation beyond ~3 remaining credits, or plan upgrade.
7. **Security hardening scope** for the web app (CORS, rate limiting, moving the system prompt server-side).
8. Anything touching money, legal (trademarks unsearched), or the founder's personal data.

---

## 9. How to contribute safely

### 9.1 Git workflow

- **Never commit directly to `main`** — it auto-deploys to production. Branch → commit → push → PR → merge.
- Branch names: descriptive, kebab-case. AI sessions typically use their assigned `claude/...` branch; **if that branch's PR was already merged, restart it from latest `main`** (`git fetch origin main && git checkout -B <branch> origin/main`) — never stack on merged history.
- Commit messages: imperative subject, body explaining *why* and *what's not obvious*. Documentation-heavy project — write commits someone can archaeology later.
- PRs: describe what changed and how it was verified. Small and single-purpose beats big and mixed.

### 9.2 Change-safety rules

- **Docs are load-bearing.** Files in `docs/founding/` are faithful extractions of the founder's documents — never edit their content (only sync them if the founder revises the source). Other docs: update freely, but version thinking ("v1.1", changelog note) beats silent rewrites.
- **The deploy is the test.** Any change to `index.html` or `api/` ships on merge. Use Vercel preview deploys (every PR gets one) and actually exercise the chat flow before merging.
- **Don't delete or regenerate media assets** — generation costs the founder real credits, and job IDs in `PRODUCTION_ASSETS.md` are reusable inputs for future generations.
- **Log every generated asset** (job ID, cost, URL, intended use) in `youtube/PRODUCTION_ASSETS.md` — and preflight costs (`get_cost: true` is free on Higgsfield) before any spend.
- **New content must pass** the pre-publish checklist (BRAND_BIBLE §9) and the hard constraints (§5 above). Scripts follow the 5-part formula (CHANNEL_STRATEGY §4) and end pointing into the ecosystem.
- **When adding features**, run the Constitution's Decision Framework (Art. XIV): mission-aligned? genuinely helpful? maintainable? simplifying? ecosystem-reinforcing? still worth building in five years? Multiple "no"s → don't build it, say why.

### 9.3 The do-not list

- Do not publish, post, or externally send anything (YouTube, social, email) without explicit founder instruction.
- Do not spend credits/money or upgrade plans without explicit approval.
- Do not add the founder's personal information anywhere new (email, address, etc.) — there is already more exposure than ideal (§2.2).
- Do not present the lore as science or let mythic language into the factual core of educational content (LORE.md §7).
- Do not resolve §8 decisions unilaterally, even if a "fix" looks obvious.
- Do not rewrite history on `main` (no force-push to `main`, ever).

### 9.4 When you finish any piece of work

1. Verify it (exercise it, don't just typecheck/eyeball).
2. Update the relevant doc(s): `PROJECT_CONTEXT.md` for decisions/assumptions, `PRODUCTION_ASSETS.md` for media, this manual for process changes.
3. Leave the written record complete enough that the *next* brand-new AI needs nothing from your session's memory. That standard is the reason this manual exists.

---

## 10. Glossary (fast lookup)

| Term | Meaning |
|---|---|
| DPA | Dragon Phoenix Ascension — the brand/ecosystem |
| Dragon Phoenix Command | The website (Cognitive Command Center) — also this repo's name |
| The Ascension Loop | Understanding → awareness → decisions → action → transformation |
| A Rising | One full pass of the loop (lore) |
| Operators | The community (proposed name, unapproved) |
| Observatory / Forge / Archive / Aviary / Engine Room | YouTube explainers / tools / knowledge base / community / AI stack (lore "rooms" = content series) |
| The Static / The Fog / The Mimic / The Anchor / Siren of Sparks | Named adversary patterns: attention economy / self-ignorance / AI dependency / willpower myth / hype |
| The Seven Laws | The brand's operating principles (Constitution, final section) |
| Fortress Hour, Ignition Protocol, Evidence Ledger, etc. | Named practical systems taught in video scripts |

**The motto, and the bar for everything shipped:** *Fire Within. Power Unleashed.*
