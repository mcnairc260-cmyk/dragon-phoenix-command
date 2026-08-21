# ARCHITECTURE — Phenomena Research Platform (PRP)

**Status: PROPOSAL v0.1 (2026-08-21). Nothing in this document has been built.**
Written in response to the founder's Master Build Directive. Per that directive's §32 and the
repo's `docs/AI_CONTINUATION_PROTOCOL.md` (Tier 3 — frameworks and dependencies are founder
decisions), implementation stops at this package until the founder authorizes Milestone 1.

Companion documents: `DATABASE_SCHEMA.md`, `RESEARCH_PIPELINE.md`, `SECURITY.md`,
`IMPLEMENTATION_PLAN.md`.

---

## 0. What this system is, in one paragraph

PRP is a **research and evidence-provenance system** for publicly accessible information about
unexplained phenomena. It finds material that ordinary search misses, preserves it with full
provenance, breaks it into individually-attributed claims, traces each claim backward toward its
earliest available source, looks specifically for independent corroboration *and* for conventional
explanations, and reports what the evidence actually supports — separately from how extraordinary
the claim is. It never decides whether a phenomenon is real.

## 1. Naming and placement

- Directory: `phenomena-research/` — a **self-contained sub-application**, following the precedent
  set by `opportunity-radar/` (`docs/PROJECT_CONTEXT.md` §16). The root site (`index.html`,
  `api/`, `vercel.json`) stays vanilla and zero-dependency and is not touched.
- The working name "Phenomena Research Platform" is **deliberately plain**. Naming it inside the
  DPA lore vocabulary (Observatory / Archive / etc.) is a founder-reserved decision
  (`docs/AI_ONBOARDING.md` §8.4) and is not made here.
- **This sub-app is not a DPA public brand surface.** Whether PRP is ever associated with the
  Dragon Phoenix Ascension brand, deployed publicly, or kept as a private research tool is a
  founder decision recorded as open in `IMPLEMENTATION_PLAN.md` §9.

## 2. Design principles

These are the load-bearing commitments. Every later decision derives from one of them.

### P1 — The Ledger is immutable; interpretation is disposable

The system keeps three separated layers of truth, and information only ever flows **upward**:

| Layer | Contents | Mutability | Who writes it |
|---|---|---|---|
| **Capture** | queries issued, results returned, fetch attempts, raw content hashes, stored text/media, timestamps, HTTP metadata | **Append-only. Never updated, never deleted.** | Deterministic code only |
| **Interpretation** | claims, entities, relationships, dedup clusters, provenance chains, scores | Versioned — a better model writes a **new row**, it never edits an old one | LLMs + deterministic analyzers, always stamped with `produced_by` |
| **Judgment** | human verdicts, annotations, corrections, "this extraction is wrong" | Human-owned; can supersede interpretation but cannot alter capture | Humans only |

This is the mechanical implementation of directive §19 ("Never allow an LLM-generated summary to
overwrite source material") and §31 (preserve uncertainty). It also means every AI mistake is
recoverable: delete the interpretation layer, re-run it, and no evidence is lost.

### P2 — Deterministic before probabilistic

Anything a computer can decide by rule is decided by rule, and the LLM never sees the work.
URL normalization, duplicate detection, robots/ToS gating, MIME and size checks, date parsing,
numeric contradiction detection, evidence grading, independence counting — all deterministic.
LLMs are used for exactly four things: claim extraction, entity extraction, semantic
contradiction/corroboration judgement, and synthesis. This is both an accuracy decision and the
single biggest cost lever (see §8).

### P3 — Every assertion is one click from its evidence

A claim row stores `source_snapshot_id` plus character offsets into the stored text. The UI can
always show the exact sentence in its original context. A claim that cannot be traced back to a
span of captured text is a bug, not a claim.

### P4 — Source quality and claim plausibility are different axes and never multiply

Directive §17. The system computes **structural** properties of evidence (is it primary? is it
independent? how many source families? what contradicts it?). It does **not** compute
"probability the phenomenon is real". `claim_plausibility` exists as a *human-only* field and is
null by default. No pipeline stage may write it.

### P5 — Scraped content is data, never instruction

All fetched content is untrusted input (directive §25). It never enters a system prompt, never
reaches a model that has tools, and never produces a free-form action. Full threat model in
`SECURITY.md`.

### P6 — Lawful public access only, designed-in

No authentication bypass, CAPTCHA solving, paywall circumvention, or access-control evasion —
and the adapters have **no surface** for it (no cookie injection, no CAPTCHA-service client, no
credential store for third-party sites). The constraint is enforced by absence, not by policy.

### P7 — Every external call costs money and must pass a budget gate

There is exactly one path to the outside world (`ProviderGateway`, §6.4). It enforces budgets,
rate limits, robots policy, caching, and deduplication. No module calls `fetch()` directly.

---

## 3. Technology stack

| Layer | Choice | Why this and not the alternative |
|---|---|---|
| Language | **TypeScript 5.x, strict**, Node 22 LTS | Directive §28. Node 22 is what's installed; matches `opportunity-radar/`'s toolchain so the founder maintains one ecosystem, not two. |
| Database | **PostgreSQL 16 + pgvector** | Directive §19. Postgres 16 client is already present in the dev environment. pgvector for near-duplicate and related-case retrieval — justified (§7), not speculative. |
| DB access | **`pg` + hand-written SQL + typed repositories.** No ORM. | An ORM hides exactly the queries that matter here (recursive provenance walks, cluster queries, vector search). Explicit SQL is auditable and matches Constitution Art. III §6 ("Simplicity Creates Power"). |
| Migrations | Numbered plain-SQL files + ~60-line runner with a `schema_migrations` table | Zero dependency, reviewable in a diff, works in CI and psql alike. |
| Job queue | **Postgres `FOR UPDATE SKIP LOCKED`** | Avoids adding Redis/BullMQ for a solo-operated system. One datastore to back up, one to reason about. Revisit only if throughput demands it. |
| HTTP API | **Fastify** | Built-in JSON-schema validation on every route (a security property, not a convenience), fast, small. |
| Frontend | **React 19 + Vite + TypeScript**, dark-mode-first | Identical stack to `opportunity-radar/` — one frontend idiom in the repo. Design language per Constitution Art. VIII (command center, dark, restrained). |
| Validation | **Zod** | One schema language for provider responses, LLM structured outputs, API bodies, and env config. Every boundary validated. |
| Browser | **Playwright**, opt-in per host, last resort | Directive §5/§28. Used only when a static fetch fails on a page that robots.txt permits. Never the default path — it is 100× the cost and latency of a fetch. |
| Tests | **Vitest** + Docker Postgres for integration | Same runner as `opportunity-radar/`. No live provider calls in CI — recorded fixtures only. |
| Logging | **pino**, structured JSON, field allowlist | Redaction is a design requirement (`SECURITY.md` §7), not an afterthought. |
| Media | **sharp** (images), **ffprobe/ffmpeg** (video metadata + keyframes), blockhash/pHash | Phase 4 only. Not installed before then. |

**Deliberately not used:** LangChain / LlamaIndex / any agent framework (the pipeline is the
value; a framework would hide it), Elasticsearch (Postgres FTS + pgvector covers the corpus size
this system will realistically reach), Redis, Kubernetes, an ORM, a graph database (§7).

## 4. Repository layout

```
phenomena-research/
├── README.md                      # entry point, setup, current status
├── docs/                          # this package
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── RESEARCH_PIPELINE.md
│   ├── SECURITY.md
│   └── IMPLEMENTATION_PLAN.md
├── package.json                   # npm workspaces root
├── .env.example                   # names only, never values
├── docker-compose.yml             # local Postgres+pgvector for dev and tests
├── migrations/                    # 0001_capture.sql, 0002_interpretation.sql, ...
├── packages/
│   ├── core/                      # PURE. Domain types, scoring, normalizers, dedup math.
│   │                              # No I/O, no network, no DB. 100% unit-testable.
│   ├── db/                        # migration runner, connection pool, repositories
│   ├── providers/                 # adapters + ProviderGateway (the only egress point)
│   ├── pipeline/                  # stages + orchestrator + budget ledger
│   ├── llm/                       # LLMProvider/EmbeddingProvider impls, prompts, routing
│   └── report/                    # report assembly and renderers (md/json/html)
└── apps/
    ├── cli/                       # `prp investigate`, `prp watch`, `prp migrate`
    ├── worker/                    # queue consumer; runs pipeline jobs
    ├── api/                       # Fastify read/write API for the dashboard
    └── web/                       # React investigator dashboard
```

`packages/core` being pure is a hard rule: it is where the scoring formulas, the evidence grader,
the URL normalizer, the date parser, and the dedup math live, and all of them must be testable
without a network or a database. If a function in `core` needs I/O, it belongs somewhere else.

## 5. Runtime topology

```
        ┌──────────────┐        ┌───────────────────────────────┐
        │  CLI / Web   │──────▶ │  API (Fastify)                │
        └──────────────┘        │  reads + enqueues jobs        │
                                └───────────────┬───────────────┘
                                                │ enqueue
                                       ┌────────▼─────────┐
                                       │  jobs (Postgres) │
                                       └────────┬─────────┘
                                   SKIP LOCKED  │
                                       ┌────────▼─────────┐
                                       │  Worker(s)       │
                                       │  pipeline stages │
                                       └────┬────────┬────┘
                                            │        │
                            ┌───────────────▼──┐  ┌──▼─────────────────┐
                            │ ProviderGateway  │  │ Postgres + pgvector│
                            │  budget · robots │  │ capture /          │
                            │  rate · cache    │  │ interpretation /   │
                            │  URL validation  │  │ judgment           │
                            └───────┬──────────┘  └────────────────────┘
                                    │
        ┌───────────┬───────────┬───┴────────┬────────────┬─────────────┐
        ▼           ▼           ▼            ▼            ▼             ▼
    Search      Scrape      Archive       LLM        Embeddings     Object store
   (Exa,       (Firecrawl,  (Wayback,   (Anthropic)  (Voyage)      (local FS or R2)
   Firecrawl,   Playwright)  LoC, ...)
   ...)
```

A single-process mode (`prp investigate --inline`) runs API-less for local research; the queue is
still Postgres so behaviour is identical.

## 6. Module contracts

### 6.1 Provider interfaces

Directive §28 requires the system to survive a provider change. Five interfaces, all in
`packages/core/src/ports/` (pure type declarations; implementations live in `packages/providers`
and `packages/llm`):

```ts
interface SearchProvider {
  readonly id: string;                       // 'exa' | 'firecrawl' | ...
  readonly capabilities: SearchCapability[]; // 'neural' | 'keyword' | 'site' | 'date-filter' | 'similar'
  search(q: SearchRequest): Promise<SearchResponse>;   // normalized hits
  findSimilar?(url: string, opts): Promise<SearchResponse>;
  estimateCost(q: SearchRequest): CostEstimate;
}

interface ScrapeProvider {
  readonly id: string;
  fetch(url: string, opts: FetchOptions): Promise<FetchedDocument>; // text + html + meta + bytes hash
  readonly supports: { pdf: boolean; js: boolean; files: boolean };
  estimateCost(opts: FetchOptions): CostEstimate;
}

interface ArchiveProvider {
  readonly id: string;
  listSnapshots(url: string, range?: DateRange): Promise<ArchiveSnapshotRef[]>;
  fetchSnapshot(ref: ArchiveSnapshotRef): Promise<FetchedDocument>;
  searchArchived?(q: string): Promise<SearchResponse>;   // e.g. LoC full-text
}

interface LLMProvider {
  readonly id: string;
  complete<T>(req: TypedRequest<T>): Promise<TypedResult<T>>;  // schema-constrained
  readonly tiers: Record<'cheap' | 'strong', string>;          // model ids
  countTokens(req): Promise<number>;
}

interface EmbeddingProvider {
  readonly id: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<Float32Array[]>;
}
```

Every provider response is parsed through a Zod schema into the platform's own normalized types
before it touches the rest of the system. Nothing downstream ever sees a vendor-shaped object —
that is what makes provider replacement a one-file change.

### 6.2 Registered adapters at MVP

| Interface | Adapter | Status at MVP | Notes |
|---|---|---|---|
| SearchProvider | `exa` (`exa-js` 2.x) | Active if key present | Neural + keyword + `findSimilar`; date filters; contents bundled with first 10 results. |
| SearchProvider | `firecrawl` (`firecrawl` 4.x, v2 API) | Active if key present | `search`, `scrape`, `map`, `crawl`; PDF and file parsing. |
| SearchProvider | `sitesearch` | Always on | Deterministic site-restricted query construction against providers above; zero extra cost. |
| ScrapeProvider | `plain` (undici + readability + pdf parse) | Always on | Free path. Tried first; providers are the fallback, not the default. |
| ScrapeProvider | `firecrawl` | If key present | For JS-rendered and awkward pages. |
| ScrapeProvider | `playwright` | Opt-in per host, off by default | Only where robots permits and the static fetch failed. |
| ArchiveProvider | `wayback` (CDX + availability) | Always on | Unauthenticated ≈1 req/s; token raises daily quota (see `IMPLEMENTATION_PLAN.md` §5). |
| ArchiveProvider | `loc` (loc.gov JSON API, Chronicling America) | Always on | Free, no key, rate-limit voluntarily. Pre-1963 US newspapers — the highest-value free source for local historical reporting. |
| LLMProvider | `anthropic` | Required | Model routing per §8. |
| EmbeddingProvider | `voyage` | Optional (degrades) | Anthropic has **no** embeddings endpoint; this is a real second vendor. Without it, semantic dedup falls back to lexical (simhash/MinHash) and the system still works. |

The system must start and run usefully with **only one** search provider configured. Adapter
absence is a normal state, logged and reported, never a crash.

### 6.3 Pipeline stage contract

Every stage is a pure-ish function of the shape:

```ts
type Stage<In, Out> = (input: In, ctx: RunContext) => Promise<StageResult<Out>>;
// RunContext carries: investigationId, budget ledger, providers, db, logger, clock, abort signal
// StageResult carries: output, spend, artifacts written, decisions log (why things were rejected)
```

Stages are individually runnable and individually testable, and each one writes its decision log
to the audit trail (directive §22) — including *rejections* and their reasons, which is what makes
an investigation reproducible.

### 6.4 ProviderGateway — the single egress point

Every outbound request passes through, in this order:

1. **URL validation** — scheme allowlist, public-IP-only DNS resolution, redirect re-validation
   (`SECURITY.md` §3).
2. **Robots / policy gate** — per-host cached `robots.txt`, `Crawl-delay`, host denylist, and a
   per-host `access_policy` record (`allow` / `metadata-only` / `deny`).
3. **Dedup / cache** — normalized-URL lookup, then content-hash lookup; unchanged pages are not
   re-fetched (directive §24). Conditional requests (`ETag`, `If-Modified-Since`) where available.
4. **Rate limiter** — per-host token bucket *and* per-provider quota.
5. **Budget gate** — `spend()` against the run's ledger; throws `BudgetExceeded` which the
   orchestrator converts into a clean, truncated-but-honest report.
6. **Execute with limits** — timeout, max bytes, max redirects, MIME allowlist.
7. **Record** — the attempt is written to `fetch_attempts` whether it succeeded or not.

Failures are first-class data. A 403, a robots denial, and a dead link are all *research findings*
and appear in reports ("this source exists but could not be lawfully retrieved").

## 7. Why Postgres and not a graph database

The directive's §15 knowledge graph is a genuine requirement; a separate graph database is not.

- The graph is small (tens of thousands of nodes per serious case, not billions).
- Postgres recursive CTEs handle the two queries that actually matter — provenance-chain walks
  (`derived_from` closure) and n-hop connection hunts — with acceptable performance at this scale,
  and `ltree`/materialized closure tables are available if a specific query gets slow.
- Every graph edge needs the same provenance stamping as everything else; a second store means a
  second consistency problem for a solo maintainer.
- pgvector covers the "find related cases I didn't know to look for" requirement, which is where
  most of the perceived value of a graph DB actually comes from here.

Revisit only with a measured query that Postgres cannot serve. That measurement is the trigger,
not a preference.

## 8. LLM architecture and model routing

Directive §29. Routing is configuration (`llm.routing.json`), not code.

| Task | Tier | Model | Rationale |
|---|---|---|---|
| Content-type classification, language ID, tagging, boilerplate stripping | *none* | deterministic | No model needed. Heuristics + libraries. |
| Entity extraction, claim extraction, quote-span location, date normalization assist | **cheap** | `claude-haiku-4-5` | High volume (every page), schema-constrained output, low reasoning demand. |
| Contradiction analysis, corroboration judgement, entity resolution across sources, research planning, query expansion, cross-source synthesis, report writing | **strong** | `claude-opus-5` | Low volume, high consequence. |
| Semantic similarity, near-duplicate detection, related-case discovery, novelty scoring | **embeddings** | `voyage-3.5-lite` | Cheapest useful axis in the system (~$0.02/MTok). |

Applied cost controls, in order of impact:

1. **Deterministic prefilter** — near-duplicate and already-seen content never reaches a model.
   Expected to remove 30–60% of fetched pages in a broad investigation.
2. **Batch API** — non-interactive extraction runs through Anthropic's Message Batches at ~50%
   cost. Interactive Quick Search does not.
3. **Prompt caching** — extraction instructions and the taxonomy are a stable prefix; the page is
   the volatile suffix. Cache hits verified via `usage.cache_read_input_tokens`, and a zero
   hit-rate is treated as a bug.
4. **Chunk before send** — pages are trimmed to relevant regions by keyword windowing before
   extraction; whole 200-page PDFs are never sent wholesale.
5. **`output_config.effort`** tuned per task — `low`/`medium` for extraction, `high` for analysis.
6. **Structured outputs** — schema-constrained results are shorter, parseable, and immune to
   an injected instruction producing prose.

Model IDs and pricing used for the cost model are stated with their as-of date in
`IMPLEMENTATION_PLAN.md` §6 and must be re-verified before any spend.

## 9. Failure and degradation posture

| Failure | Behaviour |
|---|---|
| A search provider is down or unkeyed | Investigation proceeds with the remaining providers; the report's audit section names what was unavailable and what coverage was therefore lost. |
| Embedding provider absent | Lexical dedup (MinHash/simhash) only; novelty scoring degrades to entity/claim-overlap. Reported, not hidden. |
| Budget exhausted mid-run | Clean stop. Report is produced from what exists, labelled **TRUNCATED**, with the exact queue of unexecuted next searches. |
| LLM returns invalid JSON | Zod rejects, one retry at higher effort, then the page is marked `extraction_failed` and appears in the report's "unprocessed sources" list. Never silently dropped. |
| Page unretrievable (403/paywall/robots) | Recorded as a known-but-unretrieved source, with the reason. It still appears in provenance chains as a node. |
| Contradictory extractions between runs | Both versions retained (interpretation layer is versioned); the diff is surfaced to the human. |

The recurring theme: **the system never quietly loses information, and never pretends coverage it
did not achieve.** That is the Constitution's Art. V "Accurate / evidence-informed" standard
applied to software behaviour.

## 10. Observability and reproducibility

- Every run has an `investigation_id`; every log line, DB row, and provider call carries it.
- `search_queries` + `search_results` + `fetch_attempts` + stage decision logs together constitute
  the directive §22 audit trail: a second researcher can replay exactly what was asked, what came
  back, what was opened, what was rejected, and why.
- Runs are stamped with `pipeline_version`, `prompt_version`, and model IDs, so a result can
  always be attributed to the code and prompts that produced it.
- `prp replay <investigation_id>` re-executes the recorded query set against cached content with
  no external spend — used to test pipeline changes against a known corpus.

## 11. What this architecture deliberately does not attempt

Stated here so it is not mistaken for an oversight:

- **Not a crawler of the whole internet.** It is a deep, per-case researcher. See
  `IMPLEMENTATION_PLAN.md` §8 for why "internet-scale" is not honestly achievable on a
  solo-operator budget and what is.
- **No authenticity verdicts on media.** Phase 4 establishes provenance and detects manipulation
  *signals*; it never concludes that an image is genuine (directive §12).
- **No automatic truth labelling.** No pipeline stage may write "hoax", "real", "misidentified",
  or a probability of the phenomenon being real (P4).
- **No personal-data harvesting.** Witness identification beyond what a public source already
  states, contact details, and home addresses are out of scope by design (`SECURITY.md` §8).
