# Production readiness

**Current status: DEMO-READY.** No item below marked ☐ is done. Do not let anyone rely on this system for real safety until every "Blocker" is closed and the founder approves launch in writing.

## Blockers (must be closed)

### Security
- ☐ Independent penetration test and design review. Focus: VaultLock boundary, recovery, WebAuthn, session handling, scheduler.
- ☐ Row-level security policies and separate database roles (application role cannot disable triggers; migrations run as a different role).
- ☐ `LIFELINE_SECRET` in a managed secret store / KMS, with a written rotation procedure (rotation today would break existing chains and seals — needs key-ID support).
- ☐ External anchoring of audit chain heads (write-once storage the application cannot modify).
- ☐ Nonce-based Content-Security-Policy (today inline scripts are allowed).
- ☐ Field-level encryption for Lifeline contact details; stop storing message bodies that contain live tokens in clear text.
- ☐ Dependency and secret scanning in CI; pinned, reviewed dependencies.
- ☐ Rate-limit and abuse review (registration, waitlist, consent pages); bot protection.

### Reliability
- ☐ Scheduler heartbeat: an independent monitor that pages a human if `/api/cron/tick` has not succeeded for N minutes. **Without this, a silent scheduler failure means silent non-delivery.**
- ☐ Two independent schedulers (primary + backup); the engine is already safe to run twice.
- ☐ Database: point-in-time recovery, tested restore, defined recovery time and recovery point objectives.
- ☐ Second email provider and failover; bounce and complaint handling.
- ☐ Load test of the scheduler at 10× expected accounts.
- ☐ Error reporting and alerting (for example Sentry), structured logs without personal data.
- ☐ Status page and a member-facing notice when the service is degraded.

### Live integrations (each needs explicit founder approval)
- ☐ Resend: live test in sandbox; DMARC alignment; deliverability check.
- ☐ Twilio: A2P 10DLC registration; test credentials run; STOP/HELP handling synced to consent; voice script review.
- ☐ Stripe: test-mode run against real Stripe; customer portal; tax; then live keys.

### Legal (qualified lawyer)
- ☐ Terms of service and privacy policy (placeholders exist).
- ☐ TCPA and equivalent rules for automated texts and calls; consent wording and record keeping.
- ☐ Liability and disclaimers for a safety-adjacent service; consumer-protection review of all marketing claims.
- ☐ GDPR/CCPA: lawful basis for Lifeline data, erasure against sealed records, retention schedule, sub-processor list, breach procedure.
- ☐ End-of-service policy when payment stops during active protection.
- ☐ Trademark search for "Lifeline" and "VaultLock" (**"Lifeline" is a crowded mark in medical-alert and safety services; assume a conflict until searched**).

### Operations
- ☐ Incident response plan (security incident; missed-alert incident), with named owners.
- ☐ Support process that can never unseal an account; identity checks for lockouts.
- ☐ On-call cover that does not depend on one person.
- ☐ Human-factors and safety review with personal-safety / domestic-violence specialists (grace periods, recovery delay, alert wording).

## Known limitations and vulnerabilities in this build

| # | Limitation | Risk |
|---|---|---|
| 1 | A database owner who also holds `LIFELINE_SECRET` can change anything undetected | High (insider); mitigated only by process today |
| 2 | Audit tail truncation + head reset is not detected | Medium |
| 3 | If the scheduler does not run, nothing is sent and nobody is told | High (operational) |
| 4 | Coercion: a member can be forced to check in | Inherent; ShadowMode is future work |
| 5 | Passkeys may be satisfied by a device PIN; synced passkeys are not device-bound | Medium; documented to users |
| 6 | Lost all passkeys while VaultLock is **off**: no self-service way back in | Medium (lockout, alerts will fire) |
| 7 | The 72-hour recovery delay can harm a member who must remove a dangerous Lifeline quickly. During the wait that Lifeline can still receive an alert | Needs expert review |
| 8 | Passphrase rate limit can lock the real member out for 15 minutes | Low |
| 9 | Delivery is "accepted by provider" only; email bounce webhooks not handled | Medium |
| 10 | Account deletion is not automated | Legal |
| 11 | Only Chromium was tested. Safari (the iPhone browser) and Firefox were **not** tested | Medium — iPhone is the main target |
| 12 | Accessibility: labels, landmarks, focus and contrast were designed for, and basic checks are automated, but no screen-reader or WCAG audit was done | Medium |
| 13 | Message bodies (with acknowledgment/consent tokens) are stored unencrypted | Medium |
| 14 | No email change flow; no member-visible session list | Low |

## Status vocabulary used in this project

- **IMPLEMENTED** — code exists.
- **TESTED** — a defined automated test was run and passed (see PROGRESS.md for counts and dates).
- **DEMO-READY** — suitable for a controlled demonstration with fictional data.
- **PRODUCTION-READY** — independently verified, operationally prepared, approved by the founder. **Nothing in this project has this status.**
