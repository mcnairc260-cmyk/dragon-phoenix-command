# Threat model

Scope: the MVP in this folder. "Tested" means an automated test in `tests/` or `e2e/` was run and passed. Everything else is design intent.

Assets: (1) the alert reaches the right people when a check-in is missed; (2) the plan cannot be weakened by someone else; (3) the history is truthful; (4) member and Lifeline personal data.

## The 15 scenarios

| # | Scenario | Prevented | Detected | Not covered |
|---|---|---|---|---|
| 1 | Unlocked phone is stolen | Sensitive changes need password + passphrase + passkey (tested). With VaultLock: no change at all (tested). Check-in needs the passphrase (tested) | Failed attempts and every blocked attempt are audited | Thief who also knows passphrase and device PIN can check in. Unsealed + all three secrets = full control |
| 2 | Password is learned | Sign-in also needs the passkey when one is enrolled (tested). Password is not the passphrase (tested: they must differ) | New-browser sign-in notice | Accounts with no passkey (demo mode only) |
| 3 | Email inbox is taken over | Password reset changes the password only; passphrase, passkeys, Lifelines, VaultLock untouched (tested). Reset cannot unseal (tested) | Reset is audited; all sessions end | Attacker can read reminder emails and cancel a legitimate recovery through the emailed link (fails safe: protection stays) |
| 4 | Malicious account recovery | VaultLock release needs password + recovery key + 72 h wait (tested). No support path | Member and Lifelines are notified at start; all steps audited | Attacker with password + recovery key who is not noticed for 72 h |
| 5 | Session token is stolen | Token alone cannot change protected settings (step-up) or check in (tested). 30 min idle / 12 h absolute expiry (tested). HttpOnly + SameSite=Strict cookie | Blocked attempts audited | Reading the dashboard (Lifeline names, schedule) while the token lives. No binding of token to device |
| 6 | Member is pressured to unlock the app | With VaultLock, even a willing member cannot change sealed settings on the spot (tested). Release takes 72 h and notifies Lifelines | Recovery request notices | Forced check-ins. Long coercion. This needs ShadowMode duress design (future) |
| 7 | Attempt to change Lifelines | VaultLock: API 423 + database guard (tested). Unsealed: step-up; a changed address must consent again before any alert (tested) | Audited; tamper check compares live data to the seal | — |
| 8 | Attempt to stop a countdown | VaultLock: pause/disable/delete blocked at state machine, API and database (tested). No client timestamp is read (tested) | Audited | Unsealed account + all secrets |
| 9 | Support account compromised | No support/admin interface exists. No route unseals without the member's recovery key | — | A future admin tool must keep this property. Support with database access = scenario 10 |
| 10 | Privileged administrator | Database guards stop accidental and application-level writes | Policy HMAC and audit chain expose changes made without `LIFELINE_SECRET` (tested by disabling triggers) | Administrator with database owner rights **and** the secret. Needs separation of duties, access logging outside the database, external anchoring |
| 11 | Delete or corrupt audit logs | UPDATE/DELETE/TRUNCATE rejected by trigger (tested) | Chain verification fails on any edited, removed or reordered record (tested) | Truncating the tail and resetting the head (needs external anchor). Dropping the table |
| 12 | Payment fails during protection | Engine never reads billing state; countdown and alerts continue (tested) | `billing.subscription_changed` audit event; banner in Account | End-of-service policy is not defined |
| 13 | Replay / duplicate requests | WebAuthn challenges are single-use (tested). Unique keys on incidents and messages (tested with 8 concurrent scheduler passes). Stripe events are processed once (tested) | — | Provider-side duplicates if a provider ignores the idempotency key |
| 14 | Concurrent configuration and check-in | Row locks; seal vs. edit race closed in the database guard (tested on real PostgreSQL); check-in vs. deadline race (tested) | — | Not tested under sustained load |
| 15 | Device destroyed | Countdown is server-side; alerts fire with no client (tested) | — | The member cannot check in until they use another enrolled device, or (if sealed) finish recovery. Lifelines will be alerted — this is the intended result |

## Other threats considered

| Threat | State |
|---|---|
| Scheduler stops (cron misconfigured, platform outage) | **Highest operational risk. No alert is sent while it is down.** Catch-up is correct after restart (tested). Needs external heartbeat monitoring before launch |
| Email/SMS provider outage | Retries with backoff, then `failed` + audit (tested). No second provider |
| Lifeline harassment / unwanted contact | Consent before any contact; per-channel; opt-out link; evidence stored (tested) |
| Using Lifeline to monitor someone without their knowledge | The member must check in themself. Terms must forbid misuse. Not technically prevented |
| Abusive Lifeline sealed into the plan | Recovery path with delay. The 72 h delay is a real cost here; needs expert review (domestic-violence specialists) |
| Demo controls reachable in production | All demo routes return 403 when `LIFELINE_DEMO_MODE=0` (tested) |
| XSS | React escaping; no HTML from users is rendered; CSP present but allows inline scripts (gap) |
| Secrets in the repository | None. `.env.example` has names only |

## OWASP ASVS 5.0 — self-check, **not** a compliance claim

No independent verification was done. This table records what was built against the main ASVS areas (target: Level 2, some Level 3 ideas for VaultLock).

| Area | Built | Gaps before a Level 2 claim could even be assessed |
|---|---|---|
| Authentication | Memory-hard hashing, MFA with passkeys, rate limits, no enumeration, single-use reset tokens | Breached-password check; lockout notifications; passkey attestation policy |
| Session management | Random tokens stored hashed, idle + absolute timeout, revocation, re-authentication for sensitive actions | Session list / remote sign-out for the member; token binding |
| Authorization | Every query scoped by user; server-side checks; database guards for sealed data | Row-level security; separate database roles; automated authorization test matrix |
| Input validation | Zod schemas on writes; parameterised SQL only; body size limit | Systematic output encoding review |
| Cryptography | Standard primitives only (scrypt, SHA-256, HMAC, WebAuthn) | Key rotation plan for `LIFELINE_SECRET`; KMS/HSM storage |
| Logging | Tamper-evident audit chain; no secrets in logs | Central log shipping; alerting; external anchoring |
| Data protection | Minimal data; tokens hashed at rest; `Referrer-Policy: no-referrer` | Field-level encryption of Lifeline contact data; retention schedule; message bodies with tokens are stored in clear text |
| Communications | HSTS header; TLS verification on the database connection | TLS configuration is the host's; needs scan |
| Configuration | Security headers; live keys refused without explicit flags | Nonce-based CSP; dependency scanning in CI |

**Needs independent assessment before any real use:** the VaultLock authorization boundary, the recovery flow, WebAuthn integration, the scheduler's reliability, and the whole application by penetration test.
