# DATABASE SCHEMA — CANONICAL DATA MODEL

The single reference for every entity, property, vocabulary, and relation in the DPA data layer, **wherever it is physically stored** (today: Notion; tomorrow: possibly Postgres/SQLite mirrors). If Notion and this file disagree, fix one of them the same day — schema drift is how split-brain systems are born.

## 1. Entity-relationship overview

```
                         ┌───────────┐
   Tasks ───────────────▶│           │◀─────────── Content Ideas ──▶ Knowledge Base
   Finance Ledger ──────▶│ PROJECTS  │◀─────────── Meetings                 │
   Decisions ───────────▶│  (hub)    │◀─────────── Learning                 ▼
   Automations ─────────▶│           │◀─────────── Business Metrics    Resources
   SOPs ────────────────▶└─────┬─────┘
   AI Agents ("AI Assigned")──▶│ self: Related Projects
                               ▼
              Everything answers: "which Project does this serve?"
```

## 2. Core entity schemas (Notion, inspected 2026-07-08)

### Projects `collection://aa8affb9-da62-4a0e-904b-dd41f8b8bad0`
| Property | Type | Values / target |
|---|---|---|
| Name | title | |
| Status | select | Upcoming / Active / Waiting / Completed (max 2 Active — Operating Manual rule) |
| Area | select | Content / Business / Software / Automation / Branding / Community |
| Priority | select | 🔥 High / 🟡 Medium / ⚪ Low (shared vocabulary V-PRI) |
| Effort | select | Quick / Medium / Deep |
| Progress | number % | ⚠ manual today → replace with rollup (Tasks % Done) |
| Revenue Potential | number $ | |
| Deadline | date | |
| Owner | person | |
| Relations | — | Tasks, Content, Knowledge Links→Knowledge, SOPs, Automations, Finance, Meetings, Decisions, Learning, Business Metrics, AI Assigned→AI Agents, Related Projects (self) ⚠ + Related To (duplicate — delete per Audit H3) |

### Tasks `collection://d7ea4bdd-c1af-4ab0-9bc3-dc00cd8b1064`
Task (title); Status: To Do/Doing/Blocked/Done; Next Action ✓; Priority (V-PRI); Context: 💻/📱/🎙️/🚗/🧠; Energy Level: ⚡ High Focus / 🔋 Medium / 😴 Low; Deadline; Project→Projects; Dependencies (text); Estimated Time, Actual Time ⚠ text → `Estimated Min`/`Actual Min` number; AI Responsible ⚠ text → relation to AI Agents (Audit H4).

### Content Ideas `collection://ba119349-4ded-4aa6-a43e-91865b21db3d`
Title; Status: Idea→Researching→Ready to Script→Recording→Editing→Published; Content Pillar (see §4); Format: Video/Article/Newsletter/Course Lesson/Podcast/Short; Platform (multi): YouTube/Website/Newsletter/X/LinkedIn/Podcast/Course; Priority (V-PRI); Effort: Quick/Medium/Deep Dive; Publish Date; Research Needed ✓; Repurposed ✓; Views #; CTR %; Revenue $; Watch Time ⚠ text → `Watch Hours` number; Link (url → GitHub script or published URL); Notes; Project→Projects; Knowledge→Knowledge Base.

### Knowledge Base `collection://e22769bc-85d3-4baa-930a-4f86ccef1225`
Name; Summary (mandatory by convention); Source (text; for AI-derived entries name the model); Category ⚠ 16 mixed options → split: **Type** (Note/Book/Research Paper/Quote/Mental Model/Framework) + **Category** (Psychology/Behavior/Attention/Learning/AI/Programming/Automation/Business/Marketing/Finance/Entrepreneurship); Tags (multi): Core Concept/Actionable/Reference/Video Material; Difficulty: Beginner/Intermediate/Advanced; relations: Projects, Content, Resources, Related AI→AI Agents.

### AI Agents `collection://5e43b627-3aca-4197-903d-ae8f46d8f175`
Name; Model: Claude/GPT/Gemini/Perplexity/Local/Other; Specialty, Strengths, Weaknesses, Tools, APIs (text); Connected Apps (multi): Notion/n8n/Gmail/YouTube/Etsy/Stripe/GitHub/Vercel; Status: Concept/Building/Deployed/Retired; Performance Score #; relations: Projects, Knowledge.

### Automation Dashboard `collection://9479098a-6832-4cb8-ade7-f9f71d5363d3`
Name; Purpose, Trigger, Inputs, Outputs, Errors, Improvements (text); Apps (multi): n8n/Claude/Notion/Gmail/YouTube/Stripe/Etsy/Beehiiv/GitHub/Vercel; Status: Idea/Building/Live/Paused/Retired; Last Run (date); relations: Projects, SOPs. Row Name must match its AUTOMATION_ROADMAP.md entry.

Remaining 13 databases (Journal, Finance Ledger, CRM, SOPs, Assets, Meeting Notes, Decision Log, Learning, Resources, Business Ideas, Business Dashboard, AI Workspace, Prompt Library): schemas not yet mirrored here — mirror each one *when it activates* per the phased plan (add its section then; don't document speculative shapes).

## 3. Shared vocabularies (reuse; never fork)

- **V-PRI Priority:** 🔥 High / 🟡 Medium / ⚪ Low — used identically in Projects, Tasks, Content.
- **V-LIFE Build lifecycle:** Idea / Building / Live / Paused / Retired (Automations). AI Agents' Concept/Building/Deployed/Retired is a tolerated near-miss — do **not** harmonize retroactively; new build-lifecycle DBs use V-LIFE.
- **V-EXEC Execution:** To Do / Doing / Blocked / Done (Tasks). Projects' Upcoming/Active/Waiting/Completed is the project-level analogue.
- **V-CONTENT Pipeline:** Idea → Researching → Ready to Script → Recording → Editing → Published.

## 4. Content pillar mapping (resolves the three-taxonomy drift, Audit H1)

Canonical top level = Constitution Art. VI. Notion's 8 options are sub-topics; repo series are delivery vehicles:

| Constitution pillar (canonical) | Notion sub-topics | Repo series |
|---|---|---|
| Cognitive Performance | Attention & Focus, Learning, Decision Making | The Observatory |
| Human Behavior | Human Behavior, ADHD | The Observatory |
| AI Mastery | AI, Automation | Engine Room |
| Entrepreneurship | Entrepreneurship | The Forge / Flight Data |
| Personal Growth | (tag via Human Behavior today; add option only on real need) | The Forge / Risings |

## 5. Evolution rules

1. Schema changes are proposed in a PR to this file *first* when they affect meaning; mechanical Notion edits may land first but must be mirrored here within the week.
2. Adding a select option = cheap; renaming/merging = migration — batch renames into review days.
3. When any entity outgrows Notion (≈2k+ Knowledge rows, ≈20+ videos of manual metrics), mirror it to SQLite/Postgres via n8n with Notion as UI — the schema here is written to survive that move (types, vocabularies, and relations all map 1:1 to SQL).
4. Every relation must answer to the hub rule: if an entity can't name its Project, question why it exists.
