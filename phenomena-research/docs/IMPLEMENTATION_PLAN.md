# IMPLEMENTATION PLAN — Phenomena Research Platform

**Status: PROPOSAL v0.1 (2026-08-21). Nothing built. Awaiting founder authorization.**
Companions: `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `RESEARCH_PIPELINE.md`, `SECURITY.md`.

---

## 1. Environment findings (verified 2026-08-21 in this session)

| Check | Result |
|---|---|
| Node | v22.22.2 |
| npm | 10.9.7 |
| PostgreSQL | client 16.13 present; server package `/usr/lib/postgresql/16` present |
| Docker | 29.3.1 (available for a disposable test database) |
| Python | 3.11.15 (available for OCR/media tooling if needed later) |
| Disk / RAM / CPU | ~30 GB free, 15 GB RAM, 4 cores |
| Provider keys in env | **none** — no `FIRECRAWL_API_KEY`, `EXA_API_KEY`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` |
| npm registry | reachable (`firecrawl@4.34.2`, `exa-js@2.18.1`, `playwright@1.62.1`, `pgvector@0.3.0`) |
| Outbound HTTP | **restricted allowlist** — vendor sites (firecrawl.dev, exa.ai) were blocked by the egress proxy in this session. Consequence: pricing below is from secondary sources, not vendor pages (§6). |

**Existing repo state that matters:** the root site is vanilla HTML/JS with zero dependencies and
auto-deploys from `main` to Vercel; `opportunity-radar/` is the precedent for a self-contained
React/TS/Vite sub-app under a founder-granted framework exception (`PROJECT_CONTEXT.md` §16).
Nothing in the repo overlaps with PRP; nothing needs to be deleted or rewritten.

---

## 2. Authorization status against the repo's own rules

| Item | Tier (`AI_CONTINUATION_PROTOCOL.md` §2) | Status |
|---|---|---|
| Writing this architecture package | Tier 1 | Done in this session |
| TypeScript / Node / PostgreSQL / Playwright / React | **Tier 3** (frameworks + dependencies) | **Authorized by the Master Build Directive §28**, which names the stack explicitly. Recorded as a founder approval, scoped to `phenomena-research/` only — same shape as the Opportunity Radar exception. |
| Creating provider accounts / API keys | Tier 3 | **Not done.** Needs founder action (§5). |
| Any spend | Tier 3 | **Not done.** Zero money and zero credits were spent producing this package. |
| Deploying anything publicly | Tier 3 | Not proposed. MVP runs locally. |
| Associating PRP with the DPA brand | Tier 3 | Open decision (§9). |

**Gauntlet note (Protocol §6), stated plainly and once.** PRP is off-mission for Dragon Phoenix
Ascension as the Constitution defines it (Art. I: helping people think, learn and act more
effectively) — it is a research tool about an unrelated subject, and Gate 6 (solo-founder capacity)
is the sharpest objection: this is a substantially larger system than anything currently in the
repo, and the project's own record says the founder's active priorities are the YouTube launch and
finishing what is already started. What *does* transfer is the method: PRP's evidence ledger,
source-family independence counting, and refusal to conflate source quality with claim plausibility
are a working implementation of Art. III §1 ("Truth Over Hype") and Art. V ("evidence-informed"),
and the same engine would serve the channel's own fact-verification obligation
(`PROJECT_CONTEXT.md` §9). The founder has directed this build; the concern is recorded here, not
re-litigated, and the plan below is scoped so the first milestone is small enough to abandon
cheaply if it proves to be the wrong use of the founder's time.

---

## 3. Phase plan

Phase 1 is the vertical slice the directive §27 asks for. Phases 2–8 follow the directive's own
ordering.

| Phase | Delivers | Rough effort | Gate to start |
|---|---|---|---|
| **0 — Foundation** | Workspace, TS config, lint, Vitest, Docker Postgres+pgvector, migration runner, env schema, structured logging, `packages/core` skeleton | small | founder authorization |
| **1 — MVP vertical slice** | Question → expansion → multi-provider search → retrieval → extraction → dedup → DB → scored report, end to end, CLI-driven (see §4) | **the milestone** | Phase 0 |
| **2 — Recursive source chasing** | Reference extraction → recursive fetch → `source_relations` → provenance chains → earliest-source resolution → corroboration/contradiction engines | medium | MVP working on two real cases |
| **3 — Archive discovery** | Wayback CDX + availability, loc.gov/Chronicling America adapter, dead-link recovery, archive-based dating, "the page used to say something different" detection | medium | Phase 2 |
| **4 — Media provenance** | Media capture, EXIF/codec extraction, perceptual + video hashing, derivative-generation trees, earliest-known-upload determination | medium-large | Phase 3 |
| **5 — Geospatial** | Location resolution with precision classes, PostGIS or haversine, clustering with the correlation caveat, map view | medium | Phase 3 |
| **6 — Knowledge graph + dashboard** | Full investigator dashboard (Search, Investigations, Cases, Map, Timeline, People, Evidence, Media, Documents, Graph, Watchlist), natural-language global search | large | Phases 2–5 |
| **7 — Watch mode** | Saved query sets, scheduling, change diffs, new-material-only reports | small | Phase 2 |
| **8 — Autonomous loop** | The full assess→gap→re-query cycle with all stopping conditions and cost governance | medium | Phases 2, 7 |

Effort is stated as relative size, not as a date. This is a solo project and the repo's own record
warns against optimistic scheduling.

---

## 4. MILESTONE 1 — the exact first implementation

**Deliverable:** a command-line investigation that goes from a typed question to a source-scored
Markdown report backed by a fully populated ledger, running on one machine.

```
prp migrate                      # apply schema
prp investigate --mode quick \
  --question "Val Johnson 1979 Marshall County Minnesota deputy vehicle incident" \
  --budget-usd 2.00
# → writes DB rows + reports/<investigation_id>.md and .json
```

**Scope in:** stages S1–S7 and S11–S13 of `RESEARCH_PIPELINE.md`, expansion classes 1, 2, 4, 5, 6,
13, `capture` + `interp` schemas (not `judgment`), the `exa`/`firecrawl`/`plain` adapters, the
Anthropic LLM provider with two-tier routing, the budget ledger, the audit trail, and the report
renderer.

**Scope out (deliberately):** recursive chasing (Phase 2), archives, media, geospatial, the graph,
the web dashboard, watch mode, the autonomous loop, Playwright.

**Pilot cases** — chosen because they exercise different failure modes:
1. **Val Johnson, Marshall County MN, August 1979** — a case with a contemporaneous police report,
   physical evidence on a vehicle, local newspaper coverage, and a documented skeptical
   investigation. Tests A/B/C grading and the explanation engine.
2. **A heavily-retold case of the founder's choosing** — tests source-family clustering and the
   "17 sources, 3 families" reporting requirement.

**Acceptance criteria (all must pass):**

1. Runs end to end with **only one** search provider configured, and reports the reduced coverage.
2. Every claim in the report resolves to `source_snapshot_id` + character offsets, and the span
   check passes for 100% of stored claims (fabricated spans are rejected, and the rejection count
   is reported).
3. No claim is graded above E without a resolvable primary or firsthand source.
4. The audit section lists every query executed, its provider and expansion class, results
   returned, results opened, and every rejection with its reason.
5. The budget cap is enforced: a deliberately low cap produces a clean `TRUNCATED` report with the
   unexecuted query queue attached, not a crash and not a partial write.
6. Re-running the same question re-uses cached content and executes **zero** duplicate queries and
   zero duplicate fetches.
7. The report contains no assertive-truth vocabulary outside quotation marks (lint pass green).
8. `capture` is proven immutable: an attempted `UPDATE` raises; the test asserts it.
9. ≥40 unit tests on `packages/core` (URL normalization, date parsing, dedup math, evidence
   grading, all ten scoring functions, budget ledger), plus integration tests against Dockerized
   Postgres using **recorded provider fixtures** — CI makes no live provider calls.
10. `npm run build`, `tsc -b`, `eslint`, and `vitest run` all clean.
11. No secrets in the repo; `.env.example` names only; a log-redaction test asserts that a key-
    shaped string never reaches the log output.
12. A written verification record in the PR describing what was actually exercised — per the
    repo's standard that the AI is the test (`AI_ONBOARDING.md` §3.7).

**Definition of done for the milestone as a whole:** the founder can run one command against a real
case and read a report whose every sentence he can trace to a stored source in one click.

---

## 5. Accounts, keys, and services required

| Service | Needed for | Free tier | When needed |
|---|---|---|---|
| **Anthropic API** | All extraction and analysis | No free tier; pay-as-you-go | **Milestone 1** (required) |
| **Exa** | Neural search, `findSimilar`, date-filtered discovery | $20 credit at signup + ~$10/month reported | Milestone 1 (strongly recommended) |
| **Firecrawl** | Search, scrape, crawl, map, PDF/file parsing | 1,000 credits/month reported | Milestone 1 (recommended) |
| **Voyage AI** | Embeddings (Anthropic has **no** embeddings endpoint) | Free allowance reported | Milestone 1 optional; system degrades gracefully without it |
| **Internet Archive account** | Higher CDX quota (reported: ~1k/day unauthenticated vs 100k/day authenticated) | Free | Phase 3 |
| **Library of Congress / Chronicling America** | Pre-1963 US newspapers, full text | Free, **no key required** | Phase 3 |
| **govinfo / api.data.gov key** | Congressional and federal documents | Free | Phase 3 |
| **NARA catalog API** | Federal archival records | Free, key required | Phase 3 |
| Object storage (Cloudflare R2 or local disk) | Media and raw bytes | R2 free tier | Phase 4 |
| Managed Postgres (Neon/Supabase) or self-hosted | Production database | Free tiers exist | Only when it leaves the founder's machine |

**Free vs paid summary:** the archives, government repositories and libraries — which is where the
most valuable obscure material actually lives — are **free**. The paid components are search
discovery (Exa/Firecrawl), the LLM calls, and embeddings. It is entirely possible to run a useful
Milestone 1 on free tiers plus a few dollars of Anthropic usage.

---

## 6. Cost model

**Verification caveat, stated up front.** The vendor pricing pages were unreachable from this
session's network (egress allowlist blocked `firecrawl.dev` and `exa.ai`), so the per-unit figures
below come from **secondary sources retrieved 2026-08-21** and are estimates. Anthropic model
pricing is from the bundled `claude-api` reference (cached 2026-06-24). **Re-verify every number
against the vendor's own pricing page before authorizing any spend** — and spend is Tier 3 in any
case.

**Per-unit inputs used:**

| Item | Rate used | Source |
|---|---|---|
| Claude Haiku 4.5 (`claude-haiku-4-5`) | $1.00 / MTok in, $5.00 / MTok out | Anthropic pricing table (2026-06-24) |
| Claude Opus 5 (`claude-opus-5`) | $5.00 / MTok in, $25.00 / MTok out | same |
| Message Batches | ~50% of standard | same |
| Voyage `voyage-3.5-lite` embeddings | ~$0.02 / MTok | secondary, 2026-08 |
| Exa search | ~$7 / 1,000 searches; contents for first 10 results bundled since a March 2026 change | secondary, 2026-08 |
| Firecrawl | 1 credit/page scrape; 2 credits/10 search results; 5 credits/page in enhanced mode. Standard plan ≈ $83/mo for 100k credits ≈ $0.00083/credit | secondary, 2026-08 |

**Three research intensities** (assumptions shown so the founder can argue with them):

| | **Light** (Quick Search) | **Serious** (Deep Dive) | **Intensive** (major case file) |
|---|---|---|---|
| Queries | ~15 | ~120 | ~600 |
| Pages fetched | ~40 | ~400 | ~2,000 |
| Search spend | ~$0.20 | ~$1.00 | ~$5 |
| Scrape spend | ~$0.05 | ~$0.50 | ~$3 |
| Haiku extraction | ~$0.30 | ~$2.00 (batched) | ~$10 |
| Opus analysis + synthesis | ~$0.50 | ~$3.50 | ~$18 |
| Embeddings | <$0.01 | ~$0.06 | ~$0.30 |
| **Per investigation** | **≈ $1.00–1.50** | **≈ $7–12** | **≈ $40–75** |

**Monthly scenarios:**

| Usage pattern | Fixed | Usage | Total/month |
|---|---|---|---|
| Evaluation (free tiers, a few quick searches/week) | $0 | ~$5–15 Anthropic | **$5–15** |
| Regular research (Firecrawl Hobby ~$16/mo, 2–3 deep dives/week) | ~$16 | ~$60–120 | **$75–140** |
| Heavy (Firecrawl Standard ~$83/mo, daily deep dives + watch mode over 50 topics + hosting) | ~$110 | ~$250–400 | **$350–500** |

**Cost-control levers already in the design** (`ARCHITECTURE.md` §8, directive §24): query and URL
deduplication, content hashing and caching, deterministic prefilters before any model call,
batching, prompt caching, per-investigation hard budgets, crawl-depth limits, provider quotas, and
"never re-scrape an unchanged page." Together these are the difference between the numbers above
and numbers several times larger.

**Development cost: $0 external.** The MVP builds against recorded fixtures; live provider calls
are only needed to record those fixtures once.

---

## 7. Testing and quality strategy

- **`packages/core` is pure and heavily tested** — every scoring function, the URL normalizer, the
  date-range parser, the dedup math, the evidence grader, and the budget ledger. These are the
  parts where a silent bug corrupts the research record.
- **Recorded provider fixtures.** Real responses are captured once, redacted, and committed. CI
  never calls a provider: tests stay free, deterministic, and offline.
- **Integration tests against a real Postgres** in Docker — including the immutability trigger,
  the dedup cascade, and a recursive provenance walk.
- **Golden-report tests**: a fixed fixture corpus must produce a byte-stable report, so a prompt
  or scoring change shows up as a reviewable diff.
- **An adversarial fixture set**: pages containing prompt injections, hidden text, zip bombs,
  oversized PDFs, redirect chains to private IPs, and fabricated citations. Each has an asserted
  defensive outcome (`SECURITY.md`).
- **Verification standard**: the repo has no CI and states that the contributor is the test
  (`AI_ONBOARDING.md` §3.7). Every PR states what was actually exercised and how.

---

## 8. Major limitations — stated honestly

The directive asks for an internet-scale system. The following are the real boundaries, and none
of them are solvable with more code alone.

1. **"Internet-scale" is not achievable on a solo budget, and this plan does not pretend
   otherwise.** What is achievable, and what this design targets, is *depth*: high-recall,
   deeply-chased, fully-provenanced research on one case, person, place, or document at a time.
   A system that does that well is more useful than a shallow crawler that covers more ground.
2. **The best historical local-newspaper coverage is behind paywalls** (Newspapers.com,
   GenealogyBank, NewspaperArchive). PRP will not circumvent them. Free coverage is strong for
   pre-1963 US newspapers (Chronicling America) and patchy elsewhere — which means some cases will
   have a documented, unretrievable gap. The system reports the gap rather than hiding it.
3. **Social platforms are largely closed.** Reddit, X, Facebook and TikTok data access is
   restricted, paid, or ToS-limited; private groups are out of scope entirely. Public web results
   about those posts are obtainable; the platforms' own archives generally are not.
4. **YouTube auto-captions are not available through the official API.** Metadata and descriptions
   are (quota-limited); transcripts are only usable where publicly published. Expect partial
   coverage of the video ecosystem, which is where a great deal of modern testimony now lives.
5. **EXIF is almost always stripped** by platforms, so media dating relies on archive captures,
   page metadata, and platform-declared upload dates — all of which can be wrong. "Earliest known
   public upload" will frequently mean "earliest we could evidence," and must be worded that way.
6. **Reverse image search at scale is paid and ToS-constrained.** Perceptual hashing finds
   duplicates *within the corpus*; finding an earlier copy that PRP has never seen depends on
   provider capabilities that may not exist at an affordable tier.
7. **Historical and vernacular geography is genuinely hard.** Renamed roads, split counties, local
   names that appear on no gazetteer. Hence mandatory `precision_class` — a map that implies
   precision it doesn't have is worse than no map.
8. **LLM extraction is imperfect.** Claims will occasionally be mis-scoped or mis-attributed. The
   span-offset requirement makes every one of them checkable in one click, which is the mitigation;
   the residual error rate is real and is reported, not assumed away.
9. **OCR quality on scanned documents varies enormously**, and OCR errors propagate into claims.
   The `ocr_variant` expansion class helps find documents; it does not fix their text.
10. **Rate limits make thorough research slow.** Being a good citizen to small archives is a design
    commitment, not a tunable.
11. **No single provider covers the obscure web.** Coverage is a function of how many independent
    discovery methods are configured — which is exactly why the adapter architecture exists, and
    why the report always states which providers ran.

---

## 9. Open decisions — founder only

Not decided in this session, per `AI_CONTINUATION_PROTOCOL.md` §2 Tier 3:

1. **Build at all?** The Gauntlet concern in §2 is capacity, not merit. This is the founder's call.
2. **Brand relationship.** Is PRP a private research tool, a separate product, or a DPA surface?
   This determines naming, design language, and whether the DPA lore vocabulary applies.
3. **Which providers to fund**, and the monthly ceiling. Recommendation: start at $0 fixed —
   Anthropic pay-as-you-go plus Exa and Firecrawl free tiers — and only subscribe once Milestone 1
   has proven the pipeline on a real case.
4. **Public or private.** A publicly accessible research tool about named individuals carries
   materially more legal and ethical exposure than a private one. `SECURITY.md` §8 is written for
   the private case; a public deployment needs a legal review the repo does not currently have.
5. **Whether media forensics (Phase 4) is in scope at all** — it is the largest single phase and
   the most dependent on paid capabilities.
6. **Whether the same engine should be pointed at the DPA channel's own fact-verification
   obligation** (`PROJECT_CONTEXT.md` §9). It would be a small adapter change and would convert an
   off-mission project into a partly on-mission one.

---

## 10. What happens next

On founder authorization of Milestone 1, the first PR contains: the workspace scaffold, the
migration runner and `capture`+`interp` schemas, `packages/core` with its tests, the three
adapters, the two-tier LLM provider, the budget ledger, the CLI, and the report renderer — plus a
verification record showing the pilot case run end to end.

Until then, nothing in `phenomena-research/` executes, imports, or costs anything: this directory
contains five documents and no code.
