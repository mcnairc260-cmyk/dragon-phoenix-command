# DOCUMENTATION INDEX

Every document in the DPA ecosystem, its job, and when it must be updated. **Consult this before creating any new document** — if a proposed doc's job overlaps an existing one, extend the existing one. (Requested docs `OPERATING_MANUAL` and `PROJECT_GUIDE` are deliberately *not* separate files: their jobs are already done by the Notion 📖 Operating Manual and `docs/AI_ONBOARDING.md` respectively.)

## Doctrine layer (GitHub repo)

| Document | Job | Update trigger |
|---|---|---|
| `CLAUDE.md` | AI session entry point; non-negotiables | Governance changes only |
| `docs/founding/DPA_CONSTITUTION.md` | Supreme law | **Never edited** — sync only to founder-revised source |
| `docs/founding/DPA_BLUEPRINT.md` | Strategy & architecture doctrine | Same rule |
| `docs/AI_ONBOARDING.md` | What a new contributor must know (reading order, architecture, standards, priorities) | Process/architecture changes |
| `docs/AI_CONTINUATION_PROTOCOL.md` | How AI sessions behave (authority tiers, prohibitions, gauntlet, rituals) | Operating-rule changes (bump version) |
| `docs/PROJECT_CONTEXT.md` | Session-durable facts: decisions, assumptions, tool intelligence, founder context | After any material session |
| `brand/BRAND_BIBLE.md` | Brand identity & guardrails | Founder brand decisions (palette pending!) |
| `brand/STORY.md` | Brand narratives | Founder personalization pending |
| `brand/LORE.md` | Mythology & usage rules | Founder approval of vocabulary pending |
| `youtube/CHANNEL_STRATEGY.md` | Channel doctrine: formula, packaging, funnel, launch plan | Strategy shifts |
| `youtube/VIDEO_BACKLOG.md` | The 30-video plan | New concepts / gauntlet kills |
| `youtube/scripts/*.md` | Production-ready scripts | New videos |
| `youtube/PRODUCTION_ASSETS.md` | Generated-media ledger (job IDs, costs, URLs) + render plans | **Every** media generation |
| `README.md` | Repo front door & map | New top-level docs |
| `CHANGELOG.md` | One-line history of material changes | Every merged PR |

## Architecture layer (`docs/architecture/`)

| Document | Job | Update trigger |
|---|---|---|
| `AUDIT_2026-07.md` | Point-in-time findings by severity | Frozen; next audit = new dated file |
| `SYSTEM_OVERVIEW.md` | The two-layer architecture, flows, why-decisions, scalability | Any layer/authority change |
| `NOTION_ARCHITECTURE.md` | Repo-side mirror of the Notion workspace + cross-system contract | Workspace structure changes |
| `DATABASE_SCHEMA.md` | Canonical data model, vocabularies, pillar mapping, evolution rules | Any schema change (same week) |
| `AI_WORKFLOW.md` | AI responsibility matrix, handoff contracts, dedup rules | Model/tool reassignments (quarterly re-audit) |
| `AUTOMATION_ROADMAP.md` | Design registry for all 22 automations | New designs; wave completions |
| `SOP_LIBRARY.md` | SOP index (canonical-home per SOP) | New/changed procedures |
| `ROADMAP.md` | v1.1→v10 evolution + exit criteria | Version exits; parked-idea promotions |

## Sub-application layer (`opportunity-radar/`, `phenomena-research/`)

| Document | Job | Update trigger |
|---|---|---|
| `docs/OPPORTUNITY_RADAR_MVP.md` + `opportunity-radar/README.md` | Opportunity Radar product intent, methodology, roadmap, setup | Any change to that sub-app |
| `phenomena-research/README.md` | PRP entry point, status, reading order | Status changes (proposal → built) |
| `phenomena-research/docs/ARCHITECTURE.md` | PRP design principles, stack, module + provider contracts, LLM routing | Any architectural decision |
| `phenomena-research/docs/DATABASE_SCHEMA.md` | PRP PostgreSQL data model (capture/interp/judgment layers) — *not* the Notion schema | Any schema change |
| `phenomena-research/docs/RESEARCH_PIPELINE.md` | PRP pipeline stages, query expansion, scoring formulas, research modes, report format | Any pipeline or scoring change |
| `phenomena-research/docs/SECURITY.md` | PRP threat model, injection containment, legal + PII collection constraints | Any new ingestion surface |
| `phenomena-research/docs/IMPLEMENTATION_PLAN.md` | PRP phases, Milestone 1 acceptance criteria, cost model, limitations, open founder decisions | Phase completion; cost re-verification |

## Operations layer (Notion — canonical for daily use)

| Page/DB | Job | Repo counterpart |
|---|---|---|
| 🐉 Command Center (home) | Navigation, mission, capture, parking lot | SYSTEM_OVERVIEW |
| 📖 Operating Manual | Daily/weekly/monthly operations SOPs | SOP_LIBRARY §A |
| 📐 System Documentation & Roadmap | Live workspace map, formulas, n8n list, phases, changelog | NOTION_ARCHITECTURE, AUTOMATION_ROADMAP |
| 🎯 CEO Dashboard / 📆 Weekly Review | Daily & weekly cockpits | — |
| 19 databases | Execution state | DATABASE_SCHEMA |

**Precedence when documents conflict:** Constitution > Blueprint > Brand Bible > Onboarding/Protocol > architecture docs > operational pages. Structure conflicts between NOTION_ARCHITECTURE and the live workspace: the workspace is truth for *what is*, this repo is truth for *what should be* — reconcile within a week (drift sentinel: automation A15).
