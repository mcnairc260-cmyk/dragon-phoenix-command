# AUDIT ADDENDUM — SECOND PASS (2026-07-11)

The first audit (`AUDIT_2026-07.md`, frozen) examined a system with zero automations. Three days later the environment changed materially, so this second pass covers the delta plus a self-critique of the v1 architecture package. Pattern established here: audits are frozen files; follow-ups are dated addenda.

## 1. What changed since the first pass

- **n8n is live.** A real instance is connected (founder's personal project) with a Notion API credential and one **active** workflow: `DPA — Content Idea → Pipeline Tasks` (created 2026-07-09, updated 07-10, one trigger, executable via MCP). Notion's Automation Dashboard row records it as *verified live: test execution succeeded, 5 tasks created in Tasks DB*.
- **The Automation Dashboard is being used correctly.** Design rows now exist for Quick Capture AI Router (A4), Daily Next Actions Digest (A3), and Content Repurposer (A6), all created from the 📋 template. The Notion side of the cross-system contract held without enforcement.
- **No repo changes** since PR #5 — confirming the drift is one-directional (operations moves fast, doctrine lags).

## 2. Second-pass findings

**A1′ (High) — The contract is asymmetric in practice.** Notion registered the new workflow within a day; the repo had no way to notice until an AI session looked. This validates and *elevates* automation **A15 (GitHub↔Notion drift sentinel)** from Wave 3 to build-soon; until it exists, the Weekly Review checklist should include one line: "any new Automation Dashboard rows → mirror to AUTOMATION_ROADMAP."

**A2′ (Medium) — Reality is sequencing automations differently than the roadmap.** The roadmap ordered revenue visibility first (A1 Etsy→Finance); the builder shipped a pipeline automation first (now A23) and designed A3/A4/A6 next. A23 was a defensible choice (trivial difficulty, high leverage for a completion-challenged founder), so the roadmap's order is amended rather than enforced: **A23 ✅ → A3 → A1 → A2 → A4 → A5** — revenue automations still land before content scale-up.

**A3′ (Medium) — n8n MCP governance gap.** The connected n8n MCP exposes broad scopes (create/update/publish/execute). The v1 docs never said what an AI session may do there. Rule, now added to the protocol's spirit via SOP 13: sessions may *read* everything and *test-execute* against pinned test data freely (Tier 1); creating or updating workflows is Tier 2 (act and flag); **publishing/activating** a workflow, or any workflow touching money or external sends, is Tier 3 (founder). The single Notion credential currently grants n8n full workspace access — acceptable now, scope it per-database when a second builder (human or agent) appears.

**A4′ (Low) — Self-critique of the v1 package.** (a) SOP 13 said "register in the Dashboard" but not the reverse repo-mirroring step — fixed. (b) The roadmap lacked an ID column linking designs to n8n workflow IDs — A23's entry now records one; add IDs as workflows go live. (c) The v1 audit called n8n "not yet set up" without a check date — addenda now date every environmental claim.

## 3. Updated immediate action plan (supersedes first-pass §ordering where they differ)

1. Unchanged and still open from pass one: archive media assets (C3), fix chat model ID (C4), Doctrine block on Notion home (C1), 30-video import (C2), single Phase-1 sentence (founder).
2. **New:** mirror line added for A23 (done in this PR); build A3 next in n8n (digest — design row already exists), then A1.
3. **New:** add the drift-check line to the Weekly Review page (one Notion edit, founder or next session).
4. Everything else per first-pass plan.
