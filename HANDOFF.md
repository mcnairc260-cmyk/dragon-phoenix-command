# PROJECT HANDOFF — DRAGON PHOENIX COMMAND / DPA ECOSYSTEM

**Purpose:** Everything a new collaborator (human or AI) needs to continue this project
without losing context. Written 2026-07-07.

**An honest note on provenance:** AI sessions do not carry memory between conversations.
Anything discussed in past sessions that was never committed to this repository is not
recoverable from the AI side. This document therefore does two things: (1) it consolidates
every piece of knowledge that IS recoverable — from the code, the documents, the git
history, and what they imply — including design decisions and assumptions that were
never written down explicitly; and (2) it lists, precisely, what is referenced but
missing, so the founder can fill those gaps from his own records. Nothing here is
invented to paper over a gap; gaps are flagged as gaps.

---

## 1. What this project actually is (the two layers)

This repository contains **two related but distinct things**, and understanding the
difference is the single most important piece of context:

### Layer 1 — The personal app (June 2026)
`index.html` + `api/chat.js` is a **personal AI business-mentor web app built for
Courtney McNair** — a 48-year-old entrepreneur in Birmingham, AL, building toward a
$1M revenue goal this year. The app's system prompt (in `index.html`) encodes his
personal profile:

- Ventures: kawaii clip art on Etsy, React apps, the **AutoPilot Digest** newsletter,
  a startup called **Voice Bridge**, and a children's graphic novel.
- Background: 20+ years in hospitality (craft beer, fine dining) — treated as an
  "untapped asset" for a premium brand.
- Working style: learns visually, struggles with project completion, values
  accountability. The app is deliberately direct and action-forcing ("End with ONE
  bold action for the next 24 hours").

### Layer 2 — The public brand (July 2026)
`brand/` + `youtube/` + the README define **Dragon Phoenix Ascension (DPA)** as a
*public-facing cognitive-intelligence education brand*: psychology + neuroscience +
behavioral science + systems thinking + AI, delivered primarily through a cinematic
YouTube channel. Educational, not motivational. The website is positioned in those
docs as "Dragon Phoenix Command — the Cognitive Command Center."

### The unwritten decision between them
The repo currently **reframes the personal app as the public brand's web platform**
(see README repository map) **without the app itself having been updated**. The
deployed page still shows "$1M Target This Year," "Built for Courtney," and a
personal-mentor chat. This is an unresolved seam, not an accident of ignorance:
the brand layer was added on 2026-07-05 on top of the app uploaded 2026-06-25, and
the app was never migrated. **A successor's likely first real task is deciding
whether `index.html` stays a private cockpit (and moves out of the public brand's
flagship URL) or gets rebuilt as the public Command Center per `BRAND_BIBLE.md`.**
The personal profile in the system prompt is currently visible to anyone who views
the page source — worth an explicit decision if the site is promoted publicly.

---

## 2. Reconstructed timeline (from git history)

| Date | Actor | What happened |
|---|---|---|
| 2026-06-25 | mcnairc260-cmyk (Courtney) | Repo created; `chat.js`, `index.html`, `package.json`, `vercel.json` uploaded (the personal app) |
| 2026-07-05 | Claude session | Brand foundation + YouTube package authored (`brand/`, `youtube/`); Higgsfield media generated; README expanded |
| 2026-07-06 | Courtney | PR #1 merged all of the above into `main` |
| 2026-07-07 | Claude session | This handoff written |

---

## 3. Repository inventory and status

| Path | What it is | Status |
|---|---|---|
| `index.html` | Single-file web app: hero, stats, Claude chat UI, 4 clickable "pillars", quick prompts | Working; personal-layer content; predates brand bible (see §6 conflicts) |
| `api/chat.js` | Vercel serverless proxy to the Anthropic API | Working; see §4 for every decision embedded in it |
| `vercel.json` | Rewrite `/` → `/index.html` | Trivial |
| `package.json` | Name/version only — **no dependencies, no build step, by design** | Final as-is |
| `brand/BRAND_BIBLE.md` | Positioning, voice, colors, type, vocabulary, guardrails, pre-publish checklist | v1.0, authoritative for all public content |
| `brand/STORY.md` | 50/150-word + full origin narratives, viewer story, story rules | v1.0 |
| `brand/LORE.md` | Dragon/Phoenix myth, Ascension Loop, rooms, Operators, ranks, adversaries, myth→science mapping | v1.0 |
| `youtube/CHANNEL_STRATEGY.md` | Positioning, series, video formula, packaging, funnel, pipeline, 90-day plan, metrics | v1.0 |
| `youtube/VIDEO_BACKLOG.md` | 30 videos fully specced (hook/mechanism/system/thumbnail) + Shorts engine | Complete backlog |
| `youtube/scripts/00–03` | Channel trailer (14 beats, ~215 VO words) + first three full scripts | Production-ready; claims still need the human truth-check pass before render (non-negotiable per strategy §7) |
| `youtube/PRODUCTION_ASSETS.md` | Log of generated media + trailer render plan + asset queue | Live document — keep appending |

---

## 4. The web app — every decision and assumption in the code

**Architecture:** deliberately zero-build. One static HTML file, one serverless
function, deployed on Vercel. No framework, no bundler, no npm installs. Keep it
that way unless there's a strong reason; it was chosen so a non-developer founder
can deploy by pushing to GitHub with Vercel connected.

**The API proxy (`api/chat.js`):**
- Exists solely so the Anthropic API key never reaches the browser. The key lives
  in a Vercel environment variable named **`ANTHROPIC_API_KEY`** (that exact name).
- Model: `claude-sonnet-4-6`, `max_tokens: 1024`. Both were pragmatic defaults, not
  researched choices — fine to revisit.
- CORS is wide open (`Access-Control-Allow-Origin: *`) and the endpoint has **no
  authentication and no rate limiting**. Known tradeoff for a personal tool; it
  means anyone who finds the URL can spend the API budget. If the site becomes
  public, lock this down (origin allowlist at minimum, ideally light auth or
  per-IP rate limiting).
- The function flattens Claude's response to plain text (`data.content` text blocks
  joined) and returns `{ reply }`; errors return `{ error, detail }` and the
  frontend surfaces `error` in a red bar.

**The frontend:**
- Conversation history is an in-memory JS array — **no persistence**; refresh wipes
  the chat. The full history is re-sent on every request (cost grows with chat
  length; no truncation logic exists).
- The system prompt is a `SYSTEM` const in the page and is sent by the client on
  every call. Anyone can read or override it. Moving it server-side is the obvious
  hardening step if this ever matters.
- `API_ENDPOINT` is relative (`/api/chat`) — works automatically when frontend and
  function are deployed on the same Vercel project. The code comment about changing
  it applies only if the HTML is ever hosted elsewhere.
- User message text is inserted with `innerHTML` (only `\n → <br>` escaping). XSS
  against yourself is harmless in a personal tool; fix before multi-user use.
- Quick prompts (`QUICK`) and pillars (`PILLARS`) are plain arrays at the top of the
  script — that's the intended place to edit the app's content.

**Deployment knowledge that is NOT in the repo (founder must confirm):**
- The Vercel account/team, project name, and the production URL are recorded
  nowhere in the repo. The app is presumed deployed (README says "deployed on
  Vercel") but the URL is unrecoverable from here.
- Whether `ANTHROPIC_API_KEY` is currently set and on which Vercel project.

---

## 5. The brand & YouTube layer — where the knowledge actually lives

The July-5 session wrote its knowledge down unusually thoroughly — the `brand/` and
`youtube/` docs ARE the knowledge transfer for that layer. Do not duplicate them;
read them in this order:

1. `brand/BRAND_BIBLE.md` — the rules (voice, visuals, guardrails, quality bar)
2. `brand/LORE.md` — the storytelling language (and its hard rule: *the lore never
   makes claims; the science makes claims; the lore makes them memorable*)
3. `brand/STORY.md` — the ready-to-paste narratives
4. `youtube/CHANNEL_STRATEGY.md` → `VIDEO_BACKLOG.md` → `scripts/`

Key operating rules a successor must internalize (they gate everything):
- **Never medical advice** — ADHD/mental-health content is educational/experiential
  only, with disclaimers on-screen and in descriptions.
- **No fear marketing, no false urgency, no misrepresenting titles/thumbnails.**
- **AI is crew, not captain** — a human verifies every factual claim in every script
  before render. This is stated as non-negotiable.
- Launch simplification: **first 90 days = weekly Observatory videos + Shorts only.**
  Resist adding the other series before 12 flagship videos exist.
- Success is measured by retention (≥45% avg viewed) and evidence of changed
  understanding in comments — explicitly *not* subscriber count.

---

## 6. Undocumented conflicts and assumptions (the things only a careful reader would catch)

1. **Color-system mismatch.** The live app and the brand bible disagree:

   | Token | `index.html` (June) | `BRAND_BIBLE.md` (July, authoritative) |
   |---|---|---|
   | Ember/primary | `#FF4D00` | `#FF6B2C` |
   | Gold/secondary | `#FFB347` | `#FFB300` |
   | Cyan/tertiary | `#00E5FF` | `#22D3EE` |
   | Surface | `#13131F` / `#1C1C2E` | `#14141C` (Carbon) |
   | Text | `#E8E4DC` | `#F4F4F5` (Ghost White) |
   | Muted | `#6B6B7A` | `#8B8B99` (Steel) |

   The brand bible was written *after* the app and is the intended source of truth;
   the app was never restyled. Same for type: app uses **Syne** + JetBrains Mono +
   Segoe UI; brand bible specifies **Space Grotesk/Sora/Rajdhani** (display) +
   **Inter** (body) + JetBrains Mono (HUD). JetBrains Mono is the only shared choice.

2. **Tagline drift.** The app hero says "Your Million-Dollar Operating System" and
   "personal AI business mentor"; the brand's public positioning forbids exactly this
   flavor of hype framing. Another symptom of the Layer-1/Layer-2 seam (§1).

3. **The founding documents are missing.** `BRAND_BIBLE.md` and others cite the
   **DPA Constitution v1.0** (with article numbers IV–XI referenced throughout) and
   the **Master Blueprint v1.0** as "the source of truth for everything." **Neither
   file is in this repository.** They presumably exist wherever they were originally
   written (a previous chat, Notion, Google Drive, …). This is the highest-value gap
   to close: without them, the article citations in the brand docs cannot be checked,
   and a successor inherits second-hand rules. The brand docs are internally complete
   enough to operate from, but the Constitution/Blueprint should be committed to
   `brand/` (or linked) as soon as the founder locates them.

4. **Generated media may already be gone.** The two Higgsfield assets (key art PNG +
   5s ident video) are logged in `PRODUCTION_ASSETS.md` with CloudFront URLs that the
   log itself warns may expire. If they haven't been downloaded to permanent storage
   yet, do that first — they cost credits to regenerate and the ident video is the
   planned channel intro/outro sting. The Higgsfield account was on the **free plan
   with 10 credits, ~7 spent**; the full trailer render needs ~70–120 credits (a paid
   plan), which is why the log includes a 0-credit "teaser trailer" fallback.

5. **No YouTube channel state is recorded.** Nothing in the repo says whether the
   channel exists yet, its handle, or whether any asset has been uploaded. The 90-day
   plan's Phase 0 (channel art, trailer, About page, 2 videos produced pre-launch)
   appears not started as of 2026-07-07.

6. **Off-repo ventures are context, not scope.** Etsy shop, AutoPilot Digest,
   Voice Bridge, the graphic novel — these exist only as references inside the app's
   system prompt. No credentials, URLs, or state for any of them are (or should be)
   in this repo.

---

## 7. Questions only the founder can answer

Collected here so a successor can ask them in one pass instead of rediscovering them:

1. Where are the **DPA Constitution v1.0** and **Master Blueprint v1.0**? Can they be
   committed to `brand/`?
2. What is the **production Vercel URL**, and is `ANTHROPIC_API_KEY` set on that project?
3. Have the two Higgsfield assets been **downloaded to permanent storage**? Where do
   originals live going forward (Drive folder? this repo via LFS?)?
4. Decision on the §1 seam: does `index.html` remain Courtney's private cockpit, or
   become the public DPA Command Center? (If both: separate URL or auth for the
   personal version.)
5. Does the YouTube channel exist yet? Handle? Access?
6. Is the $1M / "Built for Courtney" framing meant to appear anywhere public?

---

## 8. Where work stops and what's next (as of 2026-07-07)

**Done:** working personal chat app (deployed, presumed); complete brand system v1.0;
complete 30-video backlog; trailer + 3 scripts production-ready; 2 brand media assets
generated and logged; everything merged to `main` via PR #1.

**The next actions, in the order the existing plans imply:**
1. Secure the generated media (download before URL expiry) — `PRODUCTION_ASSETS.md`.
2. Recover and commit the Constitution + Blueprint — closes the biggest knowledge gap.
3. Human truth-check pass on scripts 01–03 (every factual claim verified or reframed
   as opinion) — required gate before any render.
4. Phase 0 of the 90-day launch plan: channel art (asset queue items 1–2), About page
   (paste `STORY.md` medium version), produce the teaser or full trailer per the
   render plan in `PRODUCTION_ASSETS.md`.
5. Resolve the app-vs-brand seam (§1) and, if the site goes public: restyle to the
   brand bible palette/type (§6.1), move the system prompt server-side, and lock down
   CORS/rate-limiting on `api/chat.js` (§4).

---

*Maintain this file: when a decision is made that isn't captured in code or the brand
docs, it goes here (or in a dated `decisions/` note). The lesson of this handoff is
that session memory is not storage — the repo is.*
