# First Dollar — a separate business experiment (not a DPA product)

Goal: earn a first $500–$1,000 from real customers before building more products.

**Read `STATE.md` first.** It holds the usage rules, decisions, and next actions. Nothing was published, sent, or spent.

| Item | State |
|---|---|
| `research/03-online-and-national-options.md` | Done. Figures come from search extracts, not opened pages. Re-check links before quoting. |
| `research/02-demo-first-websites.md` | Done. Figures come from search extracts, not opened pages. Re-check links before quoting. |
| `tools/site-audit.mjs` + `tools/lib/audit.mjs` | Working. 9/9 tests pass (`node --test tools/test/*.test.mjs`). Tested on local sample pages only — the build container cannot reach outside websites. |
| `tools/lib/site.mjs` | Builds one finished web page from a business profile. Checked by the audit tool (0 problems) but has no test file or command-line wrapper yet, and no visual check yet. |


Rules: no real business names in this public repo. No outreach, spending, or publishing without founder approval. `.vercelignore` keeps this folder out of the Vercel site.
