# SOP LIBRARY

Canonical index of every standard operating procedure. **Daily-operations SOPs live in the Notion 📖 Operating Manual** (that's where they're used); **engineering/content-quality/AI SOPs live in the repo** (that's where they're enforced). Each entry below either points to its canonical home or is defined here in full. Never maintain two prose copies — that's how the C1 split-brain started.

## A. Operations SOPs — canonical in Notion Operating Manual (summarized, not duplicated)

1. **Daily Startup** (2 min) — CEO Dashboard → Doing Now → max 3 tasks → work.
2. **Daily Shutdown** (3 min) — mark Done → Quick Capture brain-dump → one Journal line.
3. **Weekly Review** (Sun, 15 min) — Weekly Review page checklist; becomes judgment-only once A5 drafts it.
4. **Monthly Review** (30 min) — Finance totals → Journal; grade Decision Log; kill/archive 30-day-stale items; check phase.
5. **Quarterly Review** (NEW — add to Notion manual) — 60 min: re-read Constitution Art. I + XV; score the quarter against active ROADMAP version; run the 60-day empty-database rule; re-audit AI model assignments (AI_WORKFLOW quarterly rule); pick ≤ 3 priorities for next quarter; log as a Decision.
6. **Capturing Knowledge** — capture rules (idea→Quick Capture; learning→Knowledge Base w/ Summary; video idea→Content Ideas; business idea→Business Ideas).
7. **Starting a New Project** — revenue-goal test → template → DONE-in-one-sentence → 3 tasks max → max 2 Active.
8. **Managing AI Conversations** — reusable prompt→Prompt Library; insight→Knowledge w/ Source; new agent→AI Agents + Automation Dashboard; no secrets in Notion.
9. **Decision Making** — > $50 or > 5 hrs → Decision Log before deciding; monthly outcome grading.

## B. Content SOPs — canonical in repo

10. **Creating a YouTube Video** — the merged pipeline (Notion tracks status; repo holds craft):
   1. Row in Content Ideas (template) → Status=Researching; research lands as linked Knowledge rows (A7 later).
   2. Script in `youtube/scripts/<nn>-<slug>.md` following the 5-part formula (CHANNEL_STRATEGY §4) + script-file conventions (title options, thumbnail, sources block, pinned comment, Shorts cuts). Row Link → GitHub URL; Status=Ready to Script→ done when script merged.
   3. **Fact-verification pass (blocking):** every claim verified (Perplexity assist) or reframed as opinion; sources block finalized. No render before this.
   4. Produce (VO → visuals → edit; assets logged in PRODUCTION_ASSETS.md with job IDs/costs) → Recording→Editing.
   5. Pre-publish checklist (BRAND_BIBLE §9 + disclaimer check for ADHD/mental-health topics).
   6. Publish (founder action, never automated) → Status=Published, Publish Date, video ID in Link.
   7. Day 7: metrics (A2 later), Lessons Learned → Knowledge; cut Shorts (A6 later); update PRODUCTION_ASSETS if new reusable assets emerged.
11. **Publishing Content (any platform)** — founder presses the button, always (protocol §3.2); AI prepares everything up to the button: copy, packaging, checklist, scheduled draft.
12. **Idea Evaluation** — the seven-gate gauntlet, canonical in AI_CONTINUATION_PROTOCOL §6; killed ideas logged with reason in PROJECT_CONTEXT (or Decision Log if operational).

## C. Engineering & system SOPs — canonical in repo

13. **Building an Automation** — design entry in AUTOMATION_ROADMAP (all ten fields) → founder approves if it touches money/external sends → build in n8n against a *copy* of target data where possible → register row in Automation Dashboard (Status=Building) → test per SOP 14 → Live only with error-handling defaults wired (email-on-fail, idempotency) → first week: check Last Run daily. **Mirror rule:** an automation born in n8n/Notion without a roadmap entry gets one retroactively (same week), with its n8n workflow ID. **AI-session authority in n8n:** read/test-execute = Tier 1; create/update = Tier 2; publish/activate or money/external sends = Tier 3.
14. **Testing a Workflow/Change** — define the observable success behavior *before* building; exercise the real flow (send the request, run the trigger, click the page) — reading code is not testing; test the failure path too (bad input, missing field); record how it was verified in the PR/dashboard row. No tests exist in this stack by design — *you* are the test harness.
15. **Maintaining Documentation** — the layer rule (SYSTEM_OVERVIEW §1): rules→repo, state→Notion. After material work: PROJECT_CONTEXT (facts/decisions), PRODUCTION_ASSETS (media), architecture docs (structure), CHANGELOG (one line), Notion Documentation page (one line if workspace structure changed). DOCUMENTATION_INDEX lists every doc + its update trigger; consult before creating any new doc — extend an existing one first.
16. **Prompt Management** — every production prompt (n8n nodes, agent system prompts, reused creative prompts) = Prompt Library row: Name, Version, model, Rating, last-used; n8n references by name; A16 later audits drift; prompts with 3+ uses get a changelog line in-row when edited.

**Meta-rule:** an SOP that hasn't been followed in 60 days is either wrong or premature — fix it or move it to the Future Ideas parking lot (same logic as the empty-database rule).
