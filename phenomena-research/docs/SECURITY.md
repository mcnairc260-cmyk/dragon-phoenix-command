# SECURITY & LEGAL CONSTRAINTS — Phenomena Research Platform

**Status: PROPOSAL v0.1 (2026-08-21). Not implemented.** Companion to `ARCHITECTURE.md`.

This system's job is to ingest arbitrary content from the open internet and feed it to language
models. That is, structurally, one of the most hostile input surfaces a small application can
have. Everything below follows from treating that seriously.

---

## 1. Threat model

| # | Threat | Impact if unmitigated |
|---|---|---|
| T1 | **Prompt injection in scraped content** | A page instructs the extraction model; fabricated claims enter the database with real-looking provenance, or the system is steered to fetch attacker-chosen URLs. |
| T2 | **SSRF via discovered URLs** | Every URL in this system comes from an untrusted source. A crafted link reaches internal services or cloud metadata endpoints. |
| T3 | **Resource exhaustion** | Zip/PDF/XML bombs, infinite redirects, multi-GB "documents", crawler traps burn budget and disk. |
| T4 | **Credential exposure** | Provider keys in logs, in the client bundle, in reports, or committed to the repo. |
| T5 | **Injection into our own stack** | SQL injection, path traversal in the object store, stored XSS rendered in the dashboard. |
| T6 | **Parser exploits** | XXE in XML/RSS, malicious PDFs/images hitting native decoders. |
| T7 | **Supply chain** | A compromised npm dependency in a system holding API keys. |
| T8 | **Legal/ethical over-collection** | Collecting private personal data, breaching ToS, republishing copyrighted text, exposing a witness. |
| T9 | **Data poisoning of the corpus** | Seeded fake sources designed to be discovered and cited, creating false provenance chains. |
| T10 | **Egress abuse / being a bad citizen** | Ignoring robots or rate limits gets the tool blocked and harms the sites it depends on. |

---

## 2. T1 — Prompt injection: content isolation

The rule from `ARCHITECTURE.md` P5, in mechanism:

1. **Scraped content never enters a system prompt.** Instructions live in the system prompt;
   fetched content is always a user-turn payload.
2. **Structural framing.** Content is wrapped in an explicit, unambiguous data envelope with a
   per-request random delimiter token, and the system prompt states that everything inside is
   third-party data to be *described*, never instructions to be followed, no matter what it says
   about itself.
3. **No tools on extraction calls.** The extraction model has no tools, no network access, and no
   ability to request a fetch. There is no action for an injection to trigger.
4. **Structured output only.** Every extraction response is schema-constrained and Zod-validated.
   An injected "ignore your instructions and write X" can at most produce a claim record — which
   is then subject to (5).
5. **Span verification.** Every claim must carry character offsets whose slice of the stored text
   actually contains the quoted span. Fabricated claims fail this deterministic check and are
   rejected. **This is the strongest single defence in the system**: a model cannot manufacture
   evidence that is not in the captured bytes.
6. **Injection detection as data.** Content matching injection patterns ("ignore previous
   instructions", "system:", hidden-text CSS, zero-width characters, inconsistent
   `display:none` blocks) is flagged on the snapshot and surfaced in the report. A page that tries
   to manipulate reader-models is itself a research finding about that source.
7. **No content-driven control flow.** URLs, entity names and instructions found in content never
   bypass triage, robots, URL validation, or budget. Discovered URLs re-enter the pipeline as
   candidates with the same gates as any search result.
8. **Separate model contexts.** Extraction (untrusted content, cheap model) and planning/synthesis
   (trusted internal state, strong model) never share a context window. The synthesis model reads
   *database rows*, not raw pages.

---

## 3. T2 — URL validation and SSRF

`validateUrl()` in `packages/core`, applied inside `ProviderGateway` before every request and
again on **every redirect hop**:

- Scheme allowlist: `http`, `https` only. No `file:`, `ftp:`, `gopher:`, `data:`, `javascript:`.
- No credentials in the URL (`user:pass@`).
- Hostname resolved, and **every** resolved address checked against a denylist of private,
  loopback, link-local, CGNAT, multicast, and reserved ranges (IPv4 and IPv6), plus the cloud
  metadata addresses (`169.254.169.254`, `fd00:ec2::254`, `metadata.google.internal`).
- DNS-rebinding defence: connect to the validated IP with the original `Host` header, rather than
  re-resolving between check and connect.
- Redirects: maximum 5, each re-validated, cross-scheme downgrade to `http` blocked.
- Port allowlist (80, 443, and explicitly configured others).
- Internal hostnames and the deployment's own origin denied outright.

---

## 4. T3 — Resource limits

Enforced at the gateway, per request: connect/read timeout, total-time cap, `max-bytes` streaming
cutoff (hard-abort, never "read it all then check"), decompressed-size cap with a compression-ratio
ceiling (zip-bomb defence), MIME allowlist checked against **sniffed** content rather than the
declared header, PDF page cap and OCR page cap, image dimension and pixel-count caps before any
decode, per-host in-flight concurrency cap, and per-investigation totals for pages, bytes and time.

Crawler traps (calendar-style infinite URL spaces, session-id parameters) are caught by the URL
normalizer plus a per-host novel-path budget.

---

## 5. T4 — Secrets

- **All provider keys are server-side only**, read from environment variables at process start,
  validated by a Zod env schema that fails fast with a clear message naming the missing variable.
- The web dashboard never receives a provider key. It talks only to the PRP API.
- `.env` is git-ignored; only `.env.example` (names, no values) is committed. This matches the
  repo's existing rule (`docs/AI_ONBOARDING.md` §3.4: secrets only in server code via env vars).
- **Log redaction is a code path, not a habit**: the logger has a field allowlist, and a
  serializer that scrubs anything matching key-shaped patterns (`fc-`, `sk-`, `Bearer `, long
  base64/hex runs) from any string it emits — including error messages and provider stack traces,
  which are the most common leak path.
- Keys never appear in reports, in `capture` rows, in the audit trail, or in job payloads.
- Rotation procedure documented per provider; keys scoped to the minimum tier that works.

---

## 6. T5–T7 — Our own stack

- **SQL**: parameterized queries only. No string-built SQL anywhere, enforced by lint rule.
  Dynamic identifiers (rare) come from a hard-coded allowlist.
- **Object store**: keys are content-addressed (`sha256/aa/bb/<hash>.<ext>`) and never derived
  from a remote filename. No user-controlled path segments; no filename echoed to disk.
- **Dashboard XSS**: the UI **never renders scraped HTML**. It renders extracted plain text and
  the platform's own Markdown, escaped. When an original page must be previewed, it is served in
  a sandboxed iframe with a restrictive CSP (no scripts, no same-origin) or, preferably, as a
  stored screenshot image.
- **API**: JSON-schema validation on every route (Fastify), strict CORS to the dashboard origin
  only, authentication before any write route, and rate limiting on read routes. The repo's
  existing `api/chat.js` open-CORS pattern is a known defect (`PROJECT_CONTEXT.md` §7) and is
  explicitly **not** copied here.
- **Parsers**: XML/RSS parsed with external entities and DTD processing disabled (XXE). PDF and
  image parsing run with hard limits; parsing untrusted binaries in a worker process (or a
  container with no network and no secrets in its environment) is the Phase-4 requirement before
  media handling ships.
- **Dependencies**: minimal by policy, `npm ci` against a committed lockfile, `npm audit` in CI,
  no `postinstall` scripts from new dependencies without review, and Playwright pinned. Every new
  dependency is a founder-tier decision under the repo's existing rules.

---

## 7. T9 — Corpus poisoning

Mitigations are architectural rather than detective: `basis` on every provenance edge (so a chain
built from a model's inference is visibly weaker than one built from hyperlinks and verbatim
overlap), source-family clustering (a network of seeded mirrors collapses to one family), the
`SOURCE_RELIABILITY_SCORE` measured from a publisher's own citation behaviour within the corpus
rather than from a trust list, and human `judgment` rows that can supersede any interpretation.
The report's audit section always shows how many *families* support a finding, which is what a
poisoning attempt is trying to inflate.

---

## 8. T8 — Legal and ethical collection constraints

These are hard product constraints, and several are enforced by the **absence** of capability
rather than by policy text.

**Never, by design:**
- No authentication bypass. There is no credential store for third-party sites and no session
  replay. Where a site requires login, PRP records `access_status='login_required'` and stops.
- No CAPTCHA solving. No CAPTCHA-service client exists in the dependency tree.
- No paywall circumvention (no archive-of-paywalled-text tricks, no cookie manipulation, no
  referrer spoofing). Paywalled sources are recorded as known-and-unretrieved, with their citation.
- No access-control evasion, no exploitation of site vulnerabilities, no rate-limit evasion via
  rotating identities.
- No collection from private groups, closed forums, or DMs.

**Always:**
- `robots.txt` honoured per host, cached in `ops.host_policies`, `Crawl-delay` respected, with a
  conservative default when robots is unreachable.
- A truthful, identifying User-Agent with a contact URL, so operators can complain rather than
  block silently.
- Per-host rate limiting well below anything that could degrade a small site — the local
  historical societies and one-person archives this system depends on are exactly the sites least
  able to absorb load.
- API terms respected per provider, including result-retention and redistribution clauses.
- Copyright respected by the storage policy (`DATABASE_SCHEMA.md` §8): full text only for
  public-domain, government, or openly licensed works; everything else excerpt-only with the
  canonical link preserved.

**Personal information.** Historical research names people. The line this system draws:

| Permitted | Not collected, not stored, not reported |
|---|---|
| A person's public professional role, published statements, testimony, authored works, official positions, court/congressional records, and public case involvement as already published | Home addresses, phone numbers, personal email addresses, current employer or workplace of a private individual, family members, medical or psychiatric information, financial details, precise current residence |
| Names of witnesses **as already published in public sources** | Identifying an anonymous or pseudonymous witness; correlating usernames to real identities; aggregating scattered details into a de-anonymizing profile |
| Aggregation of a public figure's professional activity across cases (Person mode) | The same aggregation for a `private_individual` |

`interp.entities.person_visibility` gates this in code: Person-mode investigation is refused for
entities classified `private_individual`, report rendering redacts contact-shaped strings, and the
extraction schema has no fields for addresses or phone numbers — so there is nowhere for them to
land.

**Deletion requests.** A named individual asking for removal is honoured: a `judgment` suppression
record hides them from all reports and exports. Capture-layer immutability and a suppression list
coexist by filtering at read time, and any hard deletion required by law is executed as a
documented, audited exception.

---

## 9. Operational security

- Least-privilege database roles: the pipeline role has `INSERT`/`SELECT` on `capture` and no
  `UPDATE`/`DELETE`; the API's read role has `SELECT` only; migrations run as a separate owner.
- Automated encrypted backups of the whole database — the ledger is the asset, and a lost ledger
  cannot be re-derived at the same cost.
- Playwright, when enabled, runs sandboxed: no host filesystem mounts, no access to the secrets
  environment, its own network egress policy.
- Structured logs with `investigation_id` correlation; provider spend and error rates monitored;
  a budget breach or an unusual egress pattern is an alert, not a log line.
- No telemetry, no analytics, no third-party scripts in the dashboard.

---

## 10. Residual risks — accepted and stated

Honesty about what remains, per the repo's Continuation Protocol §3.11 (never fabricate progress):

1. **Prompt injection cannot be eliminated**, only contained. The span-verification check makes
   fabricated *evidence* very hard; it does not make a subtly biased *summary* impossible. This is
   why synthesis reads database rows and why humans hold the judgment layer.
2. **LLM extraction has an error rate.** Claims will occasionally be mis-attributed or
   mis-scoped. Every claim is one click from its source span precisely so a human can catch it,
   and `judgment.corrections` exists because this will happen.
3. **Robots.txt and ToS compliance is best-effort.** Terms are prose; parsing them is not
   automated. Any site the founder wants crawled at volume should be reviewed manually first.
4. **Provider content policies vary** on retention and redistribution of results. Before any
   public sharing of PRP output, each active provider's terms need a read (Tier 3 decision).
5. **Third-party mirrors of government documents** may carry their own copyright claims on
   scans, OCR, or arrangement even where the underlying document is public domain.
6. **Being a good citizen is a cost.** Conservative rate limits make investigations slower. That
   trade-off is deliberate and is not tuned away for speed.
