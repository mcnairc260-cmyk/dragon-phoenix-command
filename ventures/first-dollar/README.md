# First Dollar — a separate business experiment (not a DPA product)

Goal: earn a first $500–$1,000 from real customers before building more products.

**Status (2026-11-10): Phase 1 research is NOT finished. No opportunity is chosen yet. Nothing was published, sent, or spent.**

| Item | State |
|---|---|
| `research/03-online-and-national-options.md` | Done. Figures come from search extracts, not opened pages. Re-check links before quoting. |
| Research 01 (AI lead follow-up, reviews) | Not finished — agent stopped at the usage limit |
| Research 02 (demo-first websites) | Not finished — agent stopped at the usage limit |
| Birmingham prospect lists | Started only. Kept OUT of git (this repo is public). |
| `tools/site-audit.mjs` + `tools/lib/audit.mjs` | Working. 9/9 tests pass (`node --test tools/test/*.test.mjs`). Tested on local sample pages only — the build container cannot reach outside websites. |
| `tools/lib/site.mjs` | Builds one finished web page from a business profile. Checked by the audit tool (0 problems) but has no test file or command-line wrapper yet, and no visual check yet. |
| Opportunity scoring, offer, outreach drafts, tracker | Not started |

Working hypothesis (NOT yet supported by finished research): build a finished website for a local business first, show it, then charge a setup fee plus a small monthly plan.

Rules: no real business names in this public repo. No outreach, spending, or publishing without founder approval. `.vercelignore` keeps this folder out of the Vercel site.
