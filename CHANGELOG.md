# CHANGELOG

One line per material change, newest first. Format: `date · scope · what` (PR # where applicable).

- 2026-07-14 · youtube · Channel launch kit: CHANNEL_SETUP.md (paste-ready About/keywords/handle + Studio checklist) and channel art (assets/youtube/ banner 2560×1440 + avatar 800×800). Prep only — channel creation/publishing stays founder-only.
- 2026-07-14 · security · Hardened api/chat.js (founder-authorized): system prompt moved server-side with founder profile via MENTOR_PROFILE env var (PII out of page source), CORS locked to project domains, basic per-IP rate limit, input caps. Client sends only {messages}.
- 2026-07-14 · product+brand · Site typography switched to Space Grotesk/Inter with larger sizes (founder-decided, readability); founder's DPA emblem (amber-tinted) added as logo/favicon and amber key art as Deck hero visual (assets/ folder; provenance in PRODUCTION_ASSETS §3–4).
- 2026-07-12 · product · Site rebuilt as the DPA OS (founder-directed): four views — Deck (Ascension Loop + max-3 daily tasks), Mentor (brand-voice prompt), Tools (Fortress Hour, Evidence Ledger, 7-gate Gauntlet), Doctrine. Hype copy/unverified stats removed; api/chat.js model ID fixed to claude-sonnet-5.
- 2026-07-11 · architecture · Second-pass audit addendum: n8n live (first workflow A23 adopted into roadmap), amended build order, n8n AI-session authority rules in SOP 13.
- 2026-07-08 · architecture · Full ecosystem audit + architecture package: AUDIT_2026-07, SYSTEM_OVERVIEW, NOTION_ARCHITECTURE, DATABASE_SCHEMA, AI_WORKFLOW, AUTOMATION_ROADMAP, SOP_LIBRARY, ROADMAP, DOCUMENTATION_INDEX, this changelog. Discovered and documented the Notion Command Center (19 DBs) and the doctrine/operations split.
- 2026-07-07 · governance · AI Onboarding Manual + AI Continuation Protocol + CLAUDE.md entry point (#4).
- 2026-07-07 · knowledge · PROJECT_CONTEXT handoff doc; founding docs (Constitution, Blueprint) archived into docs/founding/ (#3).
- 2026-07-05 · media · Brand key art + 5s cinematic ident generated (Higgsfield); PRODUCTION_ASSETS log added.
- 2026-07-05 · brand+youtube · Brand bible, story, lore; channel strategy, 30-video backlog, 4 production scripts; README expanded (#1).
- (pre-2026-07-05) · product · Initial web app: index.html mentor UI + api/chat.js Anthropic proxy on Vercel.
