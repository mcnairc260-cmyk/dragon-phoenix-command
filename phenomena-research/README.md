# Phenomena Research Platform (PRP)

**Status: ARCHITECTURE PROPOSAL — no code exists in this directory.**
Version 0.1, 2026-08-21. Awaiting founder review and authorization of Milestone 1.

A research and evidence-provenance system for publicly accessible information about unexplained
phenomena (UAP/UFO, NHI claims, cryptozoology, and an extensible taxonomy beyond them). It is
designed to find material that ordinary search misses, preserve it with full provenance, break it
into individually-attributed claims, trace each claim back toward its earliest available source,
search deliberately for both independent corroboration and conventional explanations, and report
what the evidence actually supports.

It is **epistemically neutral by construction**. No pipeline stage may label a claim true, false,
a hoax, or a misidentification. Evidence is preserved; confidence is computed separately; the
plausibility of a claim is a human-only field.

## Read in this order

| Document | What it answers |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Design principles, stack and why, module boundaries, provider adapters, LLM routing, degradation behaviour |
| [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | The three-layer ledger (capture / interpretation / judgment), every table, indexes, dedup and date rules |
| [`docs/RESEARCH_PIPELINE.md`](docs/RESEARCH_PIPELINE.md) | The 13 stages, query expansion, provenance chasing, corroboration, contradiction, the ten scores, research modes, report format |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model, prompt-injection containment, SSRF and resource limits, secrets, legal and PII constraints |
| [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) | Environment findings, phases, **Milestone 1 and its acceptance criteria**, required accounts, cost model, limitations, open founder decisions |

## The three ideas that matter most

1. **The ledger is immutable.** What the internet gave us is append-only and can never be edited
   by a model. What models concluded is versioned, attributed, and disposable — delete it, re-run
   it, lose nothing.
2. **Every claim is one click from its evidence.** Claims carry character offsets into stored
   source text, and the offsets are verified in code. A model cannot manufacture a citation that
   is not in the captured bytes.
3. **Multiple sources are not multiple sources.** Near-duplicate detection clusters copies into
   source families, and independence is counted in families. "17 sources, 3 families, 14 of them
   tracing to one 1978 wire story" is the sentence the whole system exists to be able to write.

## Relationship to this repository

Self-contained sub-application, following the `opportunity-radar/` precedent
(`docs/PROJECT_CONTEXT.md` §16). The root site (`index.html`, `api/`, `vercel.json`) is vanilla,
zero-dependency, and untouched by this work. The stack named here (TypeScript, Node, PostgreSQL,
Playwright, React) is authorized by the founder's Master Build Directive §28 and scoped to this
directory only.

Whether PRP ever carries Dragon Phoenix Ascension branding, ships publicly, or continues at all is
a founder decision — see `docs/IMPLEMENTATION_PLAN.md` §9.
