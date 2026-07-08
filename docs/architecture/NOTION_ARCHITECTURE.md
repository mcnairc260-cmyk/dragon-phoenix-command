# NOTION ARCHITECTURE — THE 🐉 COMMAND CENTER WORKSPACE

Documents the Notion operations layer as inspected 2026-07-08. The workspace's own "📐 System Documentation & Roadmap" page holds the live architecture map and changelog; **this file is the repo-side mirror and audit record** — update both when structure changes (the Notion page is canonical for structure, this file for rationale and cross-system rules).

## 1. Topology

Home page **🐉 Dragon Phoenix Command Center** = navigation + mission + weekly focus + Quick Capture + "Future Ideas" parking lot. Hub pages: **🎯 CEO Dashboard** (daily), **📆 Weekly Review**, **📖 Operating Manual** (the operations SOPs), **📐 System Documentation & Roadmap**.

19 databases in 6 layers (per the workspace's own map): Execution (Projects ← hub, Tasks), Content (Content Ideas), Brain (Knowledge Base, Learning Dashboard, Resources Library, Business Ideas), AI (AI Agents, AI Workspace, Prompt Library, Automation Dashboard), Operations (SOPs, CRM, Finance Ledger, Assets, Meeting Notes, Decision Log), Reflection (Journal, Business Dashboard).

**Design intent (inferred and endorsed):** hub-and-spoke around Projects; phased activation (Phase 1 uses only Tasks/Projects/Content/Journal); capacity built ahead of need, process imposed only when needed.

## 2. Key schemas (inspected; full property lists in DATABASE_SCHEMA.md)

- **Projects** — Status (Upcoming/Active/Waiting/Completed), Area, Priority, Effort, Progress %, Revenue Potential, Deadline + 12 relations (Tasks, Content, Knowledge Links, SOPs, Automations, Finance, Meetings, Decisions, Learning, Business Metrics, AI Assigned, Related Projects, Related To ⚠ duplicate).
- **Tasks** — Status (To Do/Doing/Blocked/Done), Next Action ✓, Priority, Context (Computer/Phone/Recording/Errand/Thinking), Energy Level, Estimated/Actual Time (⚠ text), AI Responsible (⚠ text, should be relation), Project relation, Deadline.
- **Content Ideas** — full YouTube pipeline: Status (Idea→Researching→Ready to Script→Recording→Editing→Published), Content Pillar (⚠ 8-option taxonomy, see mapping in DATABASE_SCHEMA §4), Format, Platform, Priority, Effort, Publish Date, metrics (Views, CTR, Revenue, Watch Time ⚠ text), Repurposed ✓, relations to Project + Knowledge. Views: table, Pipeline board by Status, 🔥 High Priority, 📅 Publish Calendar, YouTube filter.
- **Knowledge Base** — Summary, Source, Category (⚠ mixes topics with formats), Tags (Core Concept/Actionable/Reference/Video Material), Difficulty, relations to Projects/Content/Resources/AI Agents.
- **AI Agents** — Model (Claude/GPT/Gemini/Perplexity/Local/Other), Specialty, Strengths/Weaknesses, Tools, APIs, Connected Apps, Status (Concept/Building/Deployed/Retired), Performance Score, relations to Projects/Knowledge.
- **Automation Dashboard** — Purpose, Trigger, Inputs, Outputs, Apps, Status (Idea/Building/Live/Paused/Retired), Last Run, Errors, Improvements, relations to Projects/SOPs. **This is the runtime registry**; the repo's AUTOMATION_ROADMAP.md is the design registry — build docs there, runtime state here.

## 3. Conventions (make these law when touching the workspace)

1. Everything links to a Project (the workspace's own stated rule — keep it).
2. One 📋 TEMPLATE row per database until converted to native templates (Audit M4); never edit the template master except to improve the template.
3. Select-option vocabularies are per-lifecycle and documented in DATABASE_SCHEMA §3 — reuse an existing vocabulary before inventing one.
4. Numbers that will ever be aggregated go in Number properties (minutes as integers), never text.
5. No secrets anywhere in Notion — names/references only (workspace rule, endorsed).
6. New databases/properties require a 3×-recurring real need (Operating Manual rule, endorsed) **plus** a row added to DATABASE_SCHEMA.md in the same week.
7. Page icons: set the icon, don't repeat the emoji in the title (Audit M6).

## 4. Cross-system contract (Notion ↔ GitHub)

| Notion object | Repo counterpart | Link rule |
|---|---|---|
| Content Ideas row (video) | `youtube/scripts/*.md` | Row's Link property → GitHub file URL once scripted; Status must reflect script reality |
| SOPs DB / Operating Manual | `docs/architecture/SOP_LIBRARY.md` | Operations SOPs canonical in Notion; engineering/content-quality SOPs canonical in repo; each side lists the other's titles |
| Automation Dashboard row | `AUTOMATION_ROADMAP.md` entry | Same Name; roadmap = design, dashboard = runtime |
| Documentation & Roadmap page | `docs/` + `CHANGELOG.md` | Structure changes logged both places (one line each) |
| Assets DB | `youtube/PRODUCTION_ASSETS.md` | Generated media logged in repo (job IDs/costs); physical/account assets in Notion |
| Home "Future Ideas" parking lot | `ROADMAP.md` | Parking lot = unsorted; ROADMAP = versioned/sequenced |

## 5. Improvement queue for the workspace (founder-approved changes only; smallest first)

1. Merge duplicate Projects self-relation (H3) and convert Tasks.AI Responsible to relation (H4) — do while DBs are near-empty.
2. Add Doctrine block to home page: links to CLAUDE.md, Constitution, Brand Bible, AI protocol (fixes C1 from the Notion side).
3. Import the 30-video backlog into Content Ideas with GitHub links (C2).
4. Apply the rollup recipes already written in the Documentation page (M3); convert template rows to native templates (M4).
5. Split Knowledge Category into Type + Category (M1); rename time fields to `* Min` numbers (M2).
6. Monthly export: Settings → Export workspace → save zip to Drive (H5) — calendar entry until automated (roadmap A14).
