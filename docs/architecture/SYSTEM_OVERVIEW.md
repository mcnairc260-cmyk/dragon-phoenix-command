# SYSTEM OVERVIEW — THE DPA OPERATING SYSTEM

**The one document that explains how everything fits together, why it's shaped this way, and how it scales.** Written 2026-07; update whenever a layer is added or authority moves.

---

## 1. The two-layer architecture (the most important fact)

The DPA ecosystem runs on two deliberately different substrates:

| Layer | Home | Contains | Changes | Authority |
|---|---|---|---|---|
| **Doctrine layer** | GitHub repo (`dragon-phoenix-command`) | Constitution & Blueprint, brand system, YouTube strategy & scripts, engineering standards, AI governance (CLAUDE.md, onboarding, protocol), architecture docs (this folder) | Slowly, via PR, versioned | Constitution > Blueprint > Brand Bible > everything |
| **Operations layer** | Notion ("🐉 Dragon Phoenix Command Center") | Projects, Tasks, Content pipeline, Knowledge Base, Prompt Library, AI Agents, Automations, Finance, Journal, CRM, SOPs for daily life | Constantly, in-place | The Operating Manual page + the doctrine layer's rules |

**Why two layers:** doctrine needs history, review, and stability (git gives that); operations need speed, relations, views, and mobile capture (Notion gives that). The failure mode is not having two layers — it's the layers not referencing each other (Audit C1). The binding rules:

1. Rules and standards live in the repo; **state** lives in Notion. If you're writing a rule in Notion or tracking execution state in the repo, you're in the wrong layer (single exception: `PRODUCTION_ASSETS.md` tracks media state in the repo because job IDs are engineering inputs).
2. Every Notion Content row for a scripted video links to its GitHub script URL. Every repo doc that has an operational counterpart names it.
3. A future AI session must load doctrine first (CLAUDE.md path), then read operational state in Notion — in that order.

## 2. Full component map

```
                    ┌────────────── DOCTRINE (GitHub) ──────────────┐
                    │ founding/ → brand/ → youtube/ → docs/ (this)  │
                    └──────────────────┬────────────────────────────┘
                                       │ governs
        ┌──────────────────────────────┼───────────────────────────────┐
        ▼                              ▼                               ▼
  OPERATIONS (Notion)          PRODUCT (Vercel)                 MEDIA (YouTube — future)
  19 DBs, 4 hub pages          index.html + api/chat.js         channel per CHANNEL_STRATEGY
  (see NOTION_ARCHITECTURE)    auto-deploys from main           fed by youtube/scripts
        │                              │                               │
        └──────────────┬───────────────┴───────────────┬──────────────┘
                       ▼                               ▼
              AUTOMATION (n8n — future)        GENERATION (Higgsfield/Descript/Canva)
              per AUTOMATION_ROADMAP           assets logged in PRODUCTION_ASSETS.md
```

**Information flow (canonical direction):** ideas → Notion Quick Capture → routed to a database (Operating Manual capture rules) → work happens (repo for scripts/code, tools for media) → results linked back to the Notion row → published output (site/YouTube) → metrics flow back into Content Ideas / Business Dashboard → weekly/monthly reviews convert metrics into decisions (Decision Log) and knowledge (Knowledge Base). Knowledge compounds by *linking*, not copying (Constitution Art. XI).

**User workflow (founder's day):** CEO Dashboard → max-3 tasks → work → Quick Capture anything that intrudes → shutdown ritual. Defined in the Notion Operating Manual; deliberately minimal because the founder's stated failure mode is project proliferation, and the system's job is to defend focus.

**AI workflow:** defined per-model in `AI_WORKFLOW.md`; governed by CLAUDE.md + AI_CONTINUATION_PROTOCOL (decision tiers, prohibited behaviors). AI sessions write durable knowledge into the layer it belongs to before ending (continuity test).

## 3. Why each major design decision exists

- **Vanilla HTML/zero deps on the site** — Blueprint's "never over-engineer"; one founder must be able to hold the whole product in his head; every dependency is a future maintenance tax.
- **`main` auto-deploys** — smallest possible ship loop for a solo founder; the compensating control is branch-protection + PR discipline (Audit H5), not a staging environment he'd never use.
- **Projects as the Notion hub** (everything relates to Projects) — one habit ("link it to a Project") keeps the graph connected; hub-and-spoke beats mesh for a solo operator because there's exactly one join point to maintain.
- **Phased activation of databases** (most start empty) — building capacity ahead of need *without* imposing process ahead of need; the 60-day rule garbage-collects unused structure.
- **Two AI governance docs** (onboarding = knowledge, protocol = behavior) — a new session needs different things at read-time vs act-time; merging them produced a document nobody finishes.
- **Markdown scripts in git rather than Notion pages** — scripts are versioned deliverables that benefit from diffs, review, and stable URLs; Notion tracks their *status*, git holds their *content*.
- **Lore split from brand bible** — myth is optional seasoning with its own usage rules; keeping it separate lets content writers load voice rules without cosplay risk.

## 4. Scalability analysis (what breaks first, at 100+ projects / 10k knowledge entries / thousands of videos / employees / agent fleets)

**Breaks first, in order:**
1. **The founder's attention** (already the bottleneck). Prevention: the max-2-active-projects rule, reviews as forcing functions, automation of metric collection before content scale-up.
2. **Notion select-taxonomies** (Category with 10k mixed-type entries becomes unusable). Prevention: Audit M1's Type/Category split *now*, while re-tagging costs zero.
3. **Hub-and-spoke relations** (a Projects DB with 100+ rows × 12 relation types gets slow and noisy). Evolution path: split Projects into Areas→Projects (two levels), archive Completed yearly into a frozen "Projects Archive" DB, keep working set under ~50 rows.
4. **Manual metrics** (Views/CTR typed by hand dies at ~20 videos). Prevention: Automation A2 (YouTube nightly sync) before video #10 ships.
5. **Notion as knowledge store** (10k entries: search degrades, no embeddings). Evolution: Knowledge Base stays the *capture* surface; add an export pipeline to a real datastore (SQLite→Postgres) with embeddings when entries pass ~2k; Notion remains UI, database becomes source of truth — same two-layer principle, applied downward.
6. **The single serverless function** (multiple products/users need auth, quotas, logging). Evolution: keep one function per concern (`api/chat`, `api/capture`, …) until real user accounts exist; then adopt a minimal framework **through the founder-approval gate** — that decision is explicitly deferred, not implied.

**Modularity rule:** things become modules when they get their own lifecycle (deploy cadence, owner, or revenue line). CLIPFORGE/Etsy, YouTube, the site, and each future product get separate Projects-Area + Finance category *now*, separate repos/workspaces only when a second person or agent owns them.

**Permissions evolution:** today one human owner + AI sessions with scoped MCP access. First hire/agent-fleet stage: Notion — workspace stays founder-owned, guests get database-level access (never workspace admin); GitHub — CODEOWNERS + required review on `docs/founding/*` and `brand/*`; secrets — per-agent API keys, never shared, listed by *name* in the Assets DB. AI agents get **write access to exactly one layer each** (an agent that writes doctrine must not also write operations data unsupervised — audit trail per agent via the AI Agents DB Performance Score + future Runs log).

**Multi-agent collaboration:** agents coordinate through the databases, not through chat history — one agent's output row (with Status) is the next agent's input query. That keeps collaboration inspectable, resumable, and model-agnostic (Constitution Art. IX: capabilities over brand loyalty). Full design in `AI_WORKFLOW.md`.

**Knowledge organization at scale:** capture flat (one DB, Summary + Source mandatory), organize by *links* (to Projects/Content/Agents), retrieve by search + relations. Hierarchies (folders, nested pages) are prohibited for knowledge — they rot; links and tags scale.
