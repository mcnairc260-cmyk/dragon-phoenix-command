# DATABASE SCHEMA — Phenomena Research Platform

**Status: PROPOSAL v0.1 (2026-08-21). Not implemented.** Companion to `ARCHITECTURE.md`.

> Not to be confused with `docs/architecture/DATABASE_SCHEMA.md` at the repo root, which documents
> the **Notion** operations workspace. This file describes the PRP PostgreSQL database only.

PostgreSQL 16 + `pgvector`. All identifiers `snake_case`. All primary keys `uuid` (v7 where
ordering helps). All timestamps `timestamptz`, UTC. No nullable booleans.

---

## 1. The three-layer rule, expressed in SQL

The `ARCHITECTURE.md` P1 separation is enforced structurally, not by convention:

| Schema | Contents | Grants held by the app role |
|---|---|---|
| `capture` | What the world gave us | `INSERT`, `SELECT`. **No `UPDATE`, no `DELETE`.** Enforced by role grants *and* a `BEFORE UPDATE OR DELETE` trigger that raises. |
| `interp` | What algorithms and models concluded | full DML, but rows are versioned — see §5 |
| `judgment` | What a human decided | full DML, restricted to authenticated human actions |
| `ops` | jobs, budgets, policies, migrations | full DML |

A nightly assertion (`SELECT` count of capture rows by day, compared to the previous run's
recorded count) detects any capture-layer loss. If that check ever fails, the system stops.

---

## 2. `capture` — the immutable ledger

### 2.1 `capture.investigations`
The research question a run answers. Immutable once started; a changed question is a new run.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `mode` | text | `quick`, `deep_dive`, `case_file`, `person`, `location`, `media`, `document_hunt`, `timeline`, `connection_hunt`, `watch` (directive §20) |
| `question` | text | the natural-language question as typed |
| `parameters` | jsonb | domain, date range, geo bbox, seeds, provider preferences |
| `budget` | jsonb | caps: usd, provider calls, pages, llm tokens, wall seconds |
| `pipeline_version` | text | git describe of the code that ran |
| `prompt_version` | text | hash of the prompt set |
| `started_at` / `finished_at` | timestamptz | |
| `status` | text | `running`, `completed`, `truncated_budget`, `truncated_time`, `failed` |
| `spend` | jsonb | actual totals, written once at finish |

### 2.2 `capture.search_queries` — directive §22
Every query executed, without exception.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `investigation_id` | uuid fk | |
| `parent_query_id` | uuid fk null | the query whose results generated this one — makes recursion auditable |
| `provider_id` | text | `exa`, `firecrawl`, `loc`, `wayback` |
| `query_text` | text | exactly as sent |
| `query_params` | jsonb | filters, date ranges, domains, `numResults` |
| `expansion_class` | text | `direct`, `synonym`, `historical`, `geographic`, `witness`, `evidence`, `bureaucratic`, `misspelling`, `ocr_variant`, `translation`, `entity_combination`, `exact_quote`, `debunk` |
| `generated_by` | text | `seed`, `rule:<name>`, `llm:<model>@<promptver>` |
| `executed_at` | timestamptz | |
| `result_count` | int | |
| `cost` | jsonb | provider units + usd estimate |
| `error` | text null | |

Unique on `(investigation_id, provider_id, query_hash)` — the same query is never paid for twice
in one investigation (directive §24).

### 2.3 `capture.search_results`
One row per hit returned, **including hits that were never opened.** Rejections are evidence about
coverage.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `query_id` | uuid fk | |
| `rank` | int | position in the provider's result list |
| `url_raw` / `url_normalized` | text | see §7 for the normalization rule |
| `title`, `snippet` | text | as returned |
| `published_hint` | text null | provider-supplied date string, unparsed |
| `provider_score` | numeric null | |
| `decision` | text | `opened`, `deduped`, `rejected_policy`, `rejected_budget`, `rejected_relevance`, `rejected_type`, `queued` |
| `decision_reason` | text | human-readable; appears verbatim in the audit report |

### 2.4 `capture.sources`
A distinct retrievable thing on the internet. One row per canonical URL, shared across
investigations.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `url_canonical` | text unique | after normalization + `rel=canonical` resolution |
| `url_discovered` | text | the first URL that led here |
| `archive_url` | text null | best archived copy |
| `host` | text | indexed |
| `title`, `author`, `publisher` | text null | |
| `published_at` | timestamptz null | + `published_precision` (`year`,`month`,`day`,`time`) |
| `published_asserted_by` | text | `page_metadata`, `byline`, `archive_first_seen`, `llm_inferred`, `unknown` — provenance for the *date itself* |
| `content_type` | text | `article`, `forum_post`, `pdf`, `government_document`, `video_page`, `image_page`, `book`, `dataset`, `transcript`, `social_post`, `newspaper_page` |
| `language` | text | |
| `first_seen_at`, `last_checked_at` | timestamptz | |
| `discovery_method` | text | `search`, `citation_chase`, `sitemap`, `archive_cdx`, `similar_to`, `manual_seed`, `watch` |
| `discovered_via_query_id` | uuid fk null | **the query that found it — directive §7, never lost** |
| `discovery_depth` | int | hops from the seed query; input to OBSCURITY_SCORE |
| `access_status` | text | `retrieved`, `robots_denied`, `paywalled`, `login_required`, `dead`, `error` |
| `license_note` | text null | drives whether full text may be stored (§8) |

### 2.5 `capture.source_snapshots`
The bytes. Multiple per source over time (watch mode, archive copies).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `source_id` | uuid fk | |
| `retrieved_at` | timestamptz | |
| `retrieval_kind` | text | `live`, `archive`, `provider_cache` |
| `archive_timestamp` | timestamptz null | the Wayback capture time, if applicable |
| `http_status` | int | |
| `content_hash` | text | sha256 of raw bytes — **the dedup primitive** |
| `text_hash` | text | sha256 of extracted text |
| `simhash` | bigint | 64-bit, for near-duplicate blocking |
| `minhash` | bigint[] | 128 permutations, for Jaccard estimation |
| `byte_size` | int | |
| `mime` | text | |
| `text_storage` | text | `full`, `excerpt_only`, `none` — set by the licence rule |
| `text` | text null | extracted plain text when `text_storage='full'` |
| `excerpt` | text null | always populated when text exists |
| `raw_object_key` | text null | object-store key for original bytes (content-addressed) |
| `extraction_method` | text | `readability`, `pdf_text`, `pdf_ocr`, `firecrawl`, `playwright`, `transcript_api` |
| `http_headers` | jsonb | allowlisted subset |
| `embedding` | vector(1024) null | of the excerpt; null when no embedding provider |

Indexes: `(source_id, retrieved_at desc)`, `content_hash`, `simhash`, ivfflat on `embedding`,
GIN on `to_tsvector('english', text)`.

### 2.6 `capture.fetch_attempts`
Every attempt, successful or not. This is how "we tried and could not get it" becomes reportable.

`id`, `investigation_id`, `url`, `provider_id`, `attempted_at`, `outcome`
(`ok`,`robots_denied`,`rate_limited`,`timeout`,`too_large`,`bad_mime`,`http_error`,`ssrf_blocked`),
`http_status`, `bytes`, `duration_ms`, `cost`, `error`.

### 2.7 `capture.media_assets`
Phase 4. `id`, `source_id`, `kind` (`image`,`video`,`audio`), `object_key`, `sha256`,
`phash`/`dhash` (bigint), `video_signature` (bytea, keyframe hash sequence), `width`, `height`,
`duration_ms`, `codec`, `frame_rate`, `bitrate`, `exif` (jsonb, as-found), `exif_present` (bool),
`upload_date_asserted`, `upload_date_source`, `derived_from_media_id` (uuid null),
`transform_signals` (jsonb: recompression/crop/mirror/color evidence).

`derived_from_media_id` is written **only** by deterministic comparison (crop/scale/mirror match on
perceptual hashes), never by an LLM.

### 2.8 `capture.documents`
Government/FOIA/academic documents get their own descriptors on top of `sources`:
`id`, `source_id`, `doc_title`, `issuing_body`, `doc_number`, `case_number`, `project_name`,
`classification_markings`, `date_of_record`, `page_count`, `ocr_quality` (numeric),
`repository` (`govinfo`,`nara`,`cia_reading_room`,`loc`,`agency_site`,`third_party_mirror`),
`is_mirror_of` (uuid null).

---

## 3. `interp` — derived, versioned, always attributed

Every table in this schema carries these four columns. They are the reason an LLM can never
corrupt the record:

| Column | Meaning |
|---|---|
| `produced_by` | `rule:<name>@<version>` or `llm:<model_id>@<prompt_version>` |
| `produced_at` | timestamptz |
| `supersedes_id` | uuid null — the row this replaces; the old row is kept |
| `is_current` | bool — exactly one current row per logical key (partial unique index) |

### 3.1 `interp.claims` — directive §8
One row per **individual factual assertion**, never one per source.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `snapshot_id` | uuid fk | the exact captured text this came from |
| `source_id` | uuid fk | denormalized for query speed |
| `claim_text` | text | normalized statement of the claim |
| `verbatim_span` | text null | the exact words when quoted |
| `char_start`, `char_end` | int | offsets into `source_snapshots.text` — **P3, one click to evidence** |
| `quoted_or_paraphrased` | text | `quoted`, `paraphrased`, `summarized_by_source` |
| `claimant_entity_id` | uuid null | who is asserting it (may differ from the author) |
| `claimant_text` | text | as named in the source |
| `date_claimed` | daterange null | when the claim was made |
| `event_date` | daterange null | when the alleged event happened (a *range*, always — see §6) |
| `event_date_precision` | text | `exact`,`day`,`month`,`season`,`year`,`decade`,`unknown` |
| `location_id` | uuid null | |
| `evidence_type` | text | `testimony`,`photograph`,`video`,`audio`,`sensor`,`document`,`physical_sample`,`measurement`,`secondhand_report`,`none` |
| `claim_type` | text | `observation`,`identity`,`measurement`,`chronology`,`attribution`,`explanation`,`provenance`,`meta` |
| `evidence_grade` | char(1) | A–F per directive §9 — **computed by rule** (§4.1), never by a model |
| `extraction_confidence` | numeric | the model's confidence *that it read the source correctly* — nothing more |
| `domain_tags` | text[] | taxonomy refs (§9) |

Explicitly absent: any column expressing whether the claim is true. `judgment.verdicts` (§4) is
the only place a truth assessment may live, and only a human writes it.

### 3.2 `interp.claim_attributes`
Structured facets extracted from claims so that **contradictions can be found arithmetically**
rather than by asking a model whether two sentences disagree.

`id`, `claim_id`, `attribute` (`duration_s`,`witness_count`,`object_height_m`,`distance_m`,
`time_of_day`,`bearing_deg`,`altitude_m`,`speed_ms`,`temperature_c`,`creature_height_m`,
`eyeshine_color`,`vehicle_count`, …), `value_num`, `value_low`, `value_high`, `unit`,
`value_text`, `normalized_from` (the original phrase, e.g. "about fifteen minutes").

Two claims about the same event whose numeric intervals do not overlap are a contradiction, found
by a SQL query and a unit conversion — no tokens spent, no model opinion involved.

### 3.3 `interp.entities` and `interp.entity_mentions`
`entities`: `id`, `kind` (`person`,`organization`,`location`,`case`,`event`,`document`,`media`,
`publication`,`aircraft`,`military_unit`,`agency`,`project`,`vessel`,`username`), `canonical_name`,
`aliases text[]`, `attributes jsonb`, `person_visibility`
(`public_figure_professional` | `private_individual` | `unknown` — drives the PII rules in
`SECURITY.md` §8), `resolution_confidence`, `merged_into_id`.

`entity_mentions`: `id`, `entity_id`, `snapshot_id`, `char_start`, `char_end`, `surface_form`,
`mention_role` (`witness`,`investigator`,`author`,`official`,`subject`,`mentioned`).

Entity resolution never destroys: merging writes `merged_into_id` and keeps both rows.

### 3.4 `interp.source_relations` — the provenance graph, directive §6
The single most important table in the system.

| Column | Notes |
|---|---|
| `id` | uuid pk |
| `from_source_id`, `to_source_id` | direction: `from` **points back to** `to` |
| `relation` | `derived_from`, `cites`, `quotes`, `mirrors`, `republishes`, `archives`, `translates`, `responds_to`, `corrects` |
| `evidence` | jsonb — the actual basis: matched quote span, hyperlink, bibliography line, identical media hash |
| `basis` | `hyperlink`, `explicit_citation`, `verbatim_overlap`, `media_hash_match`, `llm_inferred` |
| `confidence` | numeric |

`basis` matters: a chain built from hyperlinks and verbatim overlap is far stronger than one built
from a model's inference, and reports must say which they are.

### 3.5 `interp.provenance_chains`
Materialized results of walking `source_relations` backward: `id`, `claim_id` or `case_id`,
`chain jsonb` (ordered source ids with dates and relation bases), `earliest_source_id`,
`earliest_date`, `chain_confidence`, `terminates_because`
(`no_further_references`, `dead_end_paywall`, `dead_end_offline`, `circular`, `depth_limit`,
`budget_limit`). Recomputed, never edited; superseded rows are retained.

### 3.6 `interp.source_families` and `interp.source_family_members` — directive §16
Clusters of sources that are not independent. `source_families`: `id`, `representative_source_id`,
`member_count`, `basis` (`verbatim_overlap`,`syndication`,`shared_media`,`paraphrase`,
`same_publisher`), `independence_notes`. Membership carries `similarity` and `evidence`.

`INDEPENDENCE_SCORE` counts **families**, never sources. This is the mandatory distinction in
directive §10 between "multiple sources" and "multiple copies of one source."

### 3.7 `interp.corroborations` and `interp.contradictions`
`corroborations`: `id`, `claim_id`, `corroborating_claim_id`, `independence`
(`independent`,`same_family`,`unknown`), `basis`, `strength`.

`contradictions`: `id`, `claim_a_id`, `claim_b_id`, `kind` (`temporal`,`numeric`,`spatial`,
`identity`,`attribution`,`existence`,`sequence`), `detected_by` (`rule` | `llm`), `detail`,
`severity`. Contradictions are **recorded, not resolved** — the report shows all versions
(directive §11's worked example is exactly this table).

### 3.8 `interp.explanations`
Conventional/skeptical explanations found by the debunking engine (directive §11), held to the
same evidentiary standard as the claim they address: `id`, `claim_id` or `case_id`,
`explanation_text`, `explanation_type` (`misidentification`,`hoax_alleged`,`natural_phenomenon`,
`instrument_artifact`,`psychological`,`fraud_documented`,`administrative`), `source_id`,
`evidence_grade`, `addresses_which_attributes text[]`, `unaddressed_residual text`.

`unaddressed_residual` is what keeps the engine neutral: an explanation that accounts for three of
five reported attributes is recorded as accounting for three, not as "debunked."

### 3.9 `interp.scores`
One row per scored object per scoring-algorithm version. `id`, `subject_type`
(`source`,`claim`,`case`,`media`), `subject_id`, `score_name` (the eight of directive §17 plus
`OBSCURITY_SCORE` and `NOVELTY_SCORE`), `value` numeric, `components jsonb` (**every input, always
shown**), `algorithm_version`. Formulas: `RESEARCH_PIPELINE.md` §9.

### 3.10 `interp.relationships`
The general knowledge graph (directive §15) for edges that aren't source-to-source:
`subject_entity_id`, `predicate` (`witnessed`,`investigated`,`reported`,`occurred_at`,
`employed_by`,`published_in`,`references`,`associated_with`,`supported_by`,`contradicted_by`),
`object_entity_id`, `claim_id` (the claim that asserts the edge — **every edge is sourced**),
`confidence`.

An edge with no `claim_id` cannot be inserted. The graph is therefore never richer than the
evidence behind it.

---

## 4. `judgment` — human only

### 4.1 `judgment.verdicts`
`id`, `subject_type`, `subject_id`, `verdict` (`accept`,`reject`,`needs_work`,`extraction_error`,
`misattributed`), `claim_plausibility` (numeric null — **the only place this may ever be
written**), `note`, `reviewer`, `decided_at`.

### 4.2 `judgment.annotations`
Free-form researcher notes attached to any object, with `visibility` (`private`,`report`).

### 4.3 `judgment.corrections`
A human statement that an interpretation row is wrong. Writes a correction row and flips
`is_current` on the target; it never deletes.

---

## 5. Cases, events, locations, timelines

### 5.1 `interp.cases`
A case is an *interpretation*, not a fact — several reports may or may not be the same incident.
`id`, `title`, `aliases text[]`, `domain_tags`, `summary`, `earliest_known_report_date`,
`primary_location_id`, `status` (`open`,`documented`,`explained_conventionally_claimed`,
`disputed`), `confidence_of_grouping`.

### 5.2 `interp.events`
The alleged occurrence: `id`, `case_id`, `event_start` daterange, `event_precision`,
`location_id`, `witness_count_reported`, `witness_count_independent`, `duration_range_s`.

### 5.3 `capture.locations` / `interp.location_resolutions`
Raw place strings are captured; geocoding is interpretation.
`capture.locations`: `id`, `raw_text`, `source_snapshot_id`, `char_start`, `char_end`.
`interp.location_resolutions`: `location_id`, `lat`, `lon`, `precision_m`, `precision_class`
(`exact`,`address`,`town`,`county`,`region`,`country`,`unknown`), `admin1`, `admin2`, `country`,
`terrain jsonb`, `nearby_features jsonb`, `geocoder`, `confidence`, `historical_name_note`.

Historical and vernacular place names ("the old Miller road", a county that has since been split)
are a known hard problem; `precision_class` is mandatory so that a map never implies more accuracy
than exists. Geometry stored as PostGIS `geography(Point)` if PostGIS is available, otherwise
`lat`/`lon` numerics with a haversine function in `core` — PostGIS is not a Phase-1 dependency.

---

## 6. Dates: the rule

Every date in the interpretation layer is a **`daterange` plus a precision class**, never a
timestamp. "Summer 1973", "around 11:30 PM", "the late sixties" are all first-class values.
`core/dates` parses natural-language date expressions deterministically and records the original
phrase in `normalized_from`. A date the system could not parse stays as text and is reported as
unparsed — it is never guessed into a timestamp.

---

## 7. URL normalization (the dedup primitive)

Deterministic, versioned, in `packages/core`: lowercase scheme+host, strip default ports, strip
fragments, remove tracking parameters (allowlist of meaningful params per host), resolve known
redirectors and AMP/mobile variants to canonical form, sort remaining query parameters, strip
trailing slash except at root, decode gratuitous percent-encoding. The rule's version is stored,
because changing it changes what counts as a duplicate.

Dedup runs in three cascading tiers: normalized URL → `content_hash` → `simhash`/MinHash band
match → embedding cosine (only if an embedding provider exists). Each tier is cheaper than the
one after it, and each is a hard gate before any model is invoked.

---

## 8. Storage policy for full text

`text_storage` is set per snapshot by rule, in this order:
1. Public-domain / government works → `full`.
2. Explicit open licence (CC, OGL) → `full`.
3. Robots-permitted but copyrighted → `excerpt_only` (claim-bearing spans plus context, capped),
   with the canonical link always retained.
4. Anything with `access_status` other than `retrieved` → `none`.

Excerpt caps and the licence table live in config, not code, so the policy is reviewable. This
implements directive §7's "full text where legally appropriate" as a mechanism rather than a
hope.

---

## 9. Taxonomy (extensible, per directive §1)

`ops.taxonomy_terms`: `id`, `slug`, `label`, `parent_id`, `domain`
(`uap`, `nhi`, `cryptid`, `anomalous_other`), `synonyms text[]`, `historical_terms text[]`,
`ocr_variants text[]`, `translations jsonb`, `active`.

The phenomenon list in the directive is **seed data**, not schema. Adding "Dogman" or a regional
cryptid is an INSERT. Query expansion (`RESEARCH_PIPELINE.md` §3) reads its vocabulary from this
table, so extending the taxonomy immediately extends the search behaviour with no code change.

---

## 10. `ops`

`ops.jobs` (`id`, `kind`, `payload`, `status`, `attempts`, `run_after`, `locked_by`, `locked_at`,
`last_error`) — consumed with `FOR UPDATE SKIP LOCKED`.
`ops.budgets` (per investigation: caps and running totals, updated transactionally with each spend).
`ops.host_policies` (`host`, `robots_fetched_at`, `robots_body`, `crawl_delay_ms`, `access_policy`,
`notes`) — the durable record of what we are permitted to do per host.
`ops.provider_quotas` (rolling windows per provider).
`ops.watches` (saved queries for directive §20 watch mode: `query_set`, `cadence`, `last_run_at`,
`last_result_hash`, `notify`).
`ops.schema_migrations`.

---

## 11. Indexing plan (initial)

- `capture.sources`: unique `url_canonical`; btree `host`, `published_at`, `discovery_depth`.
- `capture.source_snapshots`: btree `content_hash`, `simhash`; GIN full-text on `text`;
  ivfflat `embedding vector_cosine_ops` (lists tuned at load time; HNSW considered once the corpus
  exceeds ~10⁵ snapshots).
- `interp.claims`: btree `source_id`, `event_date` (GiST on the range), `evidence_grade`;
  GIN on `domain_tags`.
- `interp.source_relations`: btree both directions — the recursive CTE walks both ways.
- `interp.claim_attributes`: btree `(attribute, value_num)` for interval-overlap contradiction
  scans.
- Partial unique index `(logical_key) WHERE is_current` on every versioned interp table.

---

## 12. Migration policy

- Forward-only numbered SQL files; every migration has a written rollback note even when a
  rollback script is impractical.
- Schema changes never rewrite `capture` data. If a capture column's meaning changes, a **new
  column** is added and the old one is retained.
- Scoring changes bump `algorithm_version` and write **new** `interp.scores` rows; historical
  scores stay queryable, so a report can always be re-read against the rules that produced it.
- Seed data (taxonomy, host policies, licence table) lives in versioned `seeds/*.sql`, separate
  from schema.
