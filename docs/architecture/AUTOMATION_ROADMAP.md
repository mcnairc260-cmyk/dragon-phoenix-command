# AUTOMATION ROADMAP — DESIGN REGISTRY

Every automation the system should eventually contain. **Design lives here; runtime state lives in the Notion Automation Dashboard** (same Name, Status, Last Run, Errors). Absorbs and extends the 7-item n8n list already in the Notion Documentation page.

**Global rules (apply to every automation):**
- *Error handling default:* on failure → n8n error workflow appends a row note to the Automation Dashboard entry (Errors field) + one email to founder; never silent failure; never retry-storms (max 3 retries, exponential backoff).
- *Recovery default:* every automation is idempotent (re-running it must not duplicate rows — match on stable keys like video ID, transaction ID, date) so recovery = re-run.
- *Secrets:* live in n8n credentials store / Vercel env — names referenced in Assets DB, values nowhere else.
- *Gate:* an automation is built only when its manual version has been done 3+ times (no automating hypothetical work), except revenue/backup automations which may lead demand.
- Difficulty scale: 🟢 trivial (< 1 evening) / 🟡 moderate (a weekend) / 🔴 hard (multi-week or fragile API).

**Recommended build order: A1 → A2 → A3 → A4 → A5 → A14 → A6 → A7 → A9 → A8 → then by phase.**

---

## Wave 1 — Revenue & pipeline visibility (build at first revenue / first published video)

**A1 · Etsy sale → Finance + Journal** (Notion list #1) — *Purpose:* revenue visible with zero effort; the motivation flywheel. *Trigger:* Etsy webhook/polling (n8n). *Inputs:* order payload. *Outputs:* Finance Ledger row (amount, product, date, Project=CLIPFORGE) + Journal "Win" line. *Deps:* Etsy API keys, Finance DB activated. *Errors:* default + daily reconciliation count vs Etsy dashboard. *Difficulty:* 🟡. *Future:* Stripe/Gumroad variants; weekly revenue digest.

**A2 · YouTube analytics nightly sync** (Notion list #2) — *Purpose:* kill manual metrics before they die of neglect (breaks at ~20 videos). *Trigger:* cron 03:00. *Inputs:* YouTube Analytics API per published Content row (match on video ID in Link). *Outputs:* Views/CTR/Watch Hours updated in place. *Deps:* YouTube channel + API OAuth; Content rows carry video IDs; M2 field fix. *Errors:* default; skip-and-flag rows with missing IDs. *Difficulty:* 🟡. *Future:* retention-curve capture into Flight Data notes.

**A3 · Daily 8am digest** (Notion list #3) — *Purpose:* the CEO Dashboard comes to the founder (ADHD-friendly: zero-friction startup). *Trigger:* cron 08:00. *Inputs:* Tasks where Next Action=✓ + today's deadlines + yesterday's Journal line. *Outputs:* one email/push. *Deps:* none beyond Notion API. *Errors:* default. *Difficulty:* 🟢. *Future:* evening shutdown variant; adaptive ordering by Energy Level.

**A4 · Quick Capture AI router** (Notion list #4) — *Purpose:* capture stays one-box; filing is machine work. *Trigger:* new block under Quick Capture (poll 15 min). *Inputs:* capture text. *Outputs:* Claude classifies → row in Content Ideas/Business Ideas/Tasks/Knowledge with correct minimal properties; original line struck through with link. *Deps:* Anthropic API key in n8n; capture conventions. *Errors:* default + unclassifiable items stay put with ⚠ marker (never guess-file). *Difficulty:* 🟡. *Recovery:* strike-through marker = processed (idempotency key). *Future:* voice capture via phone shortcut → same router.

**A5 · Weekly Review auto-draft** (Notion list #5) — *Purpose:* review becomes 15 min of judgment, zero collation. *Trigger:* cron Sunday 07:00. *Inputs:* week's Done tasks, published content, Finance rows, Journal lines. *Outputs:* pre-filled Weekly Review page section. *Deps:* A1–A3 data flowing. *Errors:* default. *Difficulty:* 🟡. *Future:* month/quarter variants (same query, wider window).

## Wave 2 — Content pipeline (build alongside videos 2–10)

**A6 · Content repurposer** (Notion list #6) — *Purpose:* every longform yields Shorts/posts without founder drafting. *Trigger:* Content Status → Published. *Inputs:* script (GitHub URL), video link. *Outputs:* Claude drafts X/LinkedIn posts + Shorts cut-list → child rows Format=Short, Status=Idea (drafts, never auto-posted — protocol §3.2). *Deps:* A2; script URLs on rows (C2 fix). *Difficulty:* 🟡. *Future:* Descript API auto-cutting the Shorts themselves.

**A7 · Research assistant pipeline** — *Purpose:* video research from Status=Researching without tab-chaos. *Trigger:* Content Status → Researching. *Inputs:* Title + hook. *Outputs:* Perplexity/Gemini sourced summaries → Knowledge rows (Source=model, Tags=Video Material) linked to the Content row; founder verifies before scripting (the verify-before-render rule stays human). *Deps:* A4 infra, API keys. *Difficulty:* 🔴 (quality tuning). *Future:* claim-checker diffing script assertions against linked sources.

**A8 · Publishing checklist bot** — *Purpose:* enforce the pre-publish checklist (BRAND_BIBLE §9) mechanically. *Trigger:* Status → Editing. *Outputs:* checklist comment on the row (title honesty, disclaimer needed?, description sources present, end-screen target, pinned comment drafted); blocks nothing — flags only. *Deps:* none hard. *Difficulty:* 🟢. *Future:* thumbnail-text contrast check via vision model.

**A9 · Newsletter assembly** — *Purpose:* weekly newsletter drafted from the week's Knowledge + Content. *Trigger:* cron Thursday. *Outputs:* Beehiiv draft (never auto-sent). *Deps:* newsletter exists (roadmap v1.2); Beehiiv API. *Difficulty:* 🟡. *Future:* subscriber-segment variants.

## Wave 3 — Operations & knowledge (build at steady revenue / Phase 3)

**A10 · CRM nudge** (Notion list #7) — *Trigger:* cron daily; Last Contact > 30 days → digest line. 🟢
**A11 · Meeting notes → actions** — *Trigger:* new Meeting Notes row; Claude extracts action items → Tasks (flagged for confirmation). 🟡
**A12 · Decision Log review reminder** — *Trigger:* monthly cron; unpraded Pending decisions → digest. 🟢
**A13 · Knowledge dedup & linking suggester** — *Trigger:* weekly; embeddings compare new Knowledge rows → suggests merges/links as comments. 🔴; prerequisite for the 10k-entry future. *Future:* full vector search (roadmap v2.0).
**A14 · Notion workspace backup** — *Trigger:* monthly cron (until then: calendar reminder). *Outputs:* workspace export zip → Drive, retention 12 copies. *Purpose:* the operations layer currently has zero backup (Audit H5). 🟡 — **build early despite wave placement.**
**A15 · GitHub → Notion doc-sync sentinel** — *Trigger:* push to main touching docs/. *Outputs:* line in Documentation page changelog + flag if NOTION_ARCHITECTURE/DATABASE_SCHEMA changed without Notion edit (drift detector for C1). 🟢
**A16 · Prompt Library sync** — *Trigger:* weekly; prompts used in n8n workflows vs Library rows diff → flags unregistered prompts. 🟢

## Wave 4 — Business platform (build with employees/agents, Phase 3+)

**A17 · Revenue dashboard rollup** — Stripe+Etsy+YouTube+affiliates → Business Dashboard monthly rows; replaces manual Finance math. 🟡
**A18 · Analytics warehouse** — nightly export of all metrics to SQLite/Postgres; Notion becomes UI over it (the §5.3 schema move). 🔴
**A19 · Agent run-logger** — every custom agent writes start/end/outcome to a Runs child-DB under AI Agents; Performance Score becomes computed. Prerequisite for multi-agent trust. 🟡
**A20 · Calendar orchestration** — deadlines/publish dates ↔ Google Calendar two-way. 🟡 (fragile two-way sync — build one-way first.)
**A21 · Gmail triage** — label + digest business inboxes; drafts replies for founder review (never auto-send). 🔴
**A22 · Learning system loop** — Learning Dashboard spaced-repetition reminders drawn from Knowledge rows tagged Core Concept (the platform eating its own dog food — teaching-system-as-product prototype). 🟡 *Future:* becomes a user-facing Command Center feature (roadmap v3.0).
