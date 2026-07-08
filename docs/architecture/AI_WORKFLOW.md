# AI WORKFLOW — THE DPA AI OPERATING SYSTEM

How every AI in the ecosystem divides labor, hands off work, and avoids duplicating knowledge. Extends the Constitution's AI Charter (Art. IX) and Automation Philosophy (Art. X); governed by `docs/AI_CONTINUATION_PROTOCOL.md`. Principle: **capabilities over brand loyalty** — these assignments describe current best fit, not permanent bindings; re-audit quarterly.

## 1. Responsibility matrix

| System | Owns | Explicitly does NOT own |
|---|---|---|
| **Claude (Code sessions)** | Everything in the GitHub repo: code, brand/scripts drafting, doctrine docs, architecture; long-form reasoning; repo↔Notion sync tasks | Publishing; spending; founder-reserved decisions (protocol Tier 3) |
| **ChatGPT** | Strategy conversations, prompt engineering, workflow design, education/brainstorming with the founder; likely author of the Notion OS — continues as its co-designer | Writing to the repo (its outputs enter via founder or a Claude session, gauntlet-checked) |
| **Gemini** | High-volume research, Google-ecosystem work (Drive/Calendar/Gmail analysis), large-context document digestion | Brand voice work; final drafts |
| **Perplexity** | Sourced research with citations — the fact-verification pass required before any script renders (protocol §3.3) | Anything creative |
| **NotebookLM** | Grounded Q&A over a fixed corpus (founding docs + brand bible + published scripts) — the founder's "ask my own doctrine" tool | Generating new doctrine |
| **n8n** | Scheduled/triggered data movement between systems (see AUTOMATION_ROADMAP) | Judgment of any kind — routes and formats only |
| **GitHub** | Version control, review gate, deploy trigger, stable URLs for cross-referencing | Operational state (that's Notion) |
| **Higgsfield / Descript / Canva** | Media generation, edit-by-text, packaging — always logged to PRODUCTION_ASSETS.md | Unlogged spending (preflight costs, record job IDs) |
| **Future custom agents** | One narrow job each, registered in the AI Agents DB with Model, Specialty, Connected Apps, Performance Score **before** deployment | Multi-layer write access (one write-layer per agent) |

## 2. Information flow with minimal duplication

The anti-duplication rule: **every fact has exactly one home; everything else links to it.**

- Research finding → Knowledge Base row (Summary + Source mandatory) → scripts/strategy *link* to it. Never paste the same finding into two places.
- Reusable prompt → Prompt Library (Version + Rating) → agents reference by name.
- Decision (> $50 or > 5 hrs) → Decision Log *before* acting → other docs cite the row.
- Session-durable context → the correct doctrine doc (PROJECT_CONTEXT for facts, this folder for architecture) — never only in chat history.
- Cross-AI handoff = a Notion row + status, not a pasted transcript. Example pipeline: Perplexity researches → human/Claude distills to Knowledge rows → Claude drafts script in repo linking those rows → founder verifies claims (Perplexity assist) → Descript/Higgsfield produce → n8n updates Content row on publish → analytics flow back → Flight Data review writes lessons to Knowledge. Each system reads the previous system's *structured output*, not its conversation.

## 3. Handoff contracts

1. **Into the repo:** anything an external AI (ChatGPT/Gemini) produced enters through a session that applies the idea-gauntlet + brand voice check; the commit message names the origin ("from founder's ChatGPT strategy session, 2026-07-xx").
2. **Out of the repo:** scripts/strategy reaching production tools go by GitHub URL (stable, versioned), never by paste.
3. **Between sessions of the same AI:** the continuity test (protocol §7.5) — repo + Notion must suffice; if a successor would need your chat history, you're not done.
4. **Agent-to-agent (future):** producer writes a row with Status, consumer polls/filters that status; no direct agent-to-agent messaging until an audit log exists (Runs child-DB, roadmap v2.0).

## 4. Model-selection heuristics (today's defaults)

Deep reasoning/long documents/code → Claude. Rapid ideation/prompt iteration → ChatGPT. Bulk summarization/Google data → Gemini. Anything requiring citations → Perplexity. Anything requiring *taste* (voice, story, thumbnail) → strongest available reasoning model **plus mandatory human pass** — taste is never delegated (Constitution: humans keep creativity).
