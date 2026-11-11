# Progress log

Last updated: 2026-11-11 (first build session). Update this file at the end of every work session.

## Status in one line

**MVP is DEMO-READY.** All 24 required MVP features are IMPLEMENTED. Core flows are TESTED. **Nothing is PRODUCTION-READY.** Nothing is deployed. No real message, charge or external account exists.

## Test results (run 2026-11-11, this session)

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, 0 warnings |
| `npm test` — Vitest on embedded PostgreSQL (PGlite) | **84 / 84 pass** |
| Same suite on PostgreSQL 16 (real server, real row locks) | **84 / 84 pass** (run 4 times) |
| `npm run build` — production build | Pass |
| `npm run e2e` — Playwright on the production build, Chromium, phone viewport (Pixel 7) + desktop | **6 / 6 pass** |
| `npm audit --omit=dev` | 0 known vulnerabilities on this date |
| Manual: zero-setup start, register, restart, sign in (data persisted) | Pass |

**Not run / not tested:** Safari, iOS, Firefox. A real phone. Real Face ID. Live Resend, Twilio or Stripe servers. Load. Screen readers. Any independent security test.

Defects found by the tests and fixed in this session:
1. **Seal-versus-edit race** (found only on real PostgreSQL): a Lifeline edit running at the same moment as sealing could leave live data different from the sealed snapshot. Fixed in the database guard (row lock).
2. Blocked passphrase change under VaultLock was refused but not audited. Fixed.
3. Onboarding jumped past the Lifelines step after the first Lifeline was added. Fixed.
4. Dashboard scrolled sideways on phones after recent messages loaded. Fixed.

## MVP feature status (directive §18)

| # | Feature | Implemented | Tested | Notes |
|---|---|---|---|---|
| 1 | Marketing landing page | Yes | e2e | Pricing, security, FAQ, waitlist, legal placeholders, SEO metadata |
| 2 | Registration and login | Yes | Unit + e2e | |
| 3 | Biometric-capable authentication (passkeys) | Yes | Unit (software authenticator) + e2e (virtual authenticator) | Not tested on a physical device |
| 4 | Separate verification passphrase | Yes | Unit + e2e | |
| 5 | Onboarding | Yes | e2e | |
| 6 | Custom check-in intervals | Yes | Unit + e2e | 1 hour – 60 days |
| 7 | Backend-managed countdown | Yes | Unit | Server clock only |
| 8 | Configurable reminders | Yes | Unit | |
| 9 | Lifeline registration | Yes | Unit + e2e | |
| 10 | Consent tracking | Yes | Unit + e2e | Per channel, evidence stored, opt-out |
| 11 | Escalation logic | Yes | Unit + e2e | Simultaneous, sequential, custom stages |
| 12 | Email integration or sandbox | Yes | Simulated: tested. Resend adapter: **not tested live** | |
| 13 | SMS adapter + simulation | Yes | Simulated: tested. Twilio adapter: **not tested live** | |
| 14 | Voice adapter + simulation | Yes | Simulated: tested. Twilio adapter: **not tested live** | |
| 15 | Dashboard | Yes | e2e | |
| 16 | Notification history | Yes | e2e | |
| 17 | VaultLock activation + sealed policy | Yes | Unit + e2e | |
| 18 | Server-side VaultLock enforcement | Yes | Unit (API + direct SQL) + e2e | |
| 19 | Protected audit events | Yes | Unit | HMAC hash chain + append-only triggers |
| 20 | Secure recovery architecture | Yes | Unit | Password + recovery key + delay + notices. UI page exists; e2e does not cover it |
| 21 | Countdown-expiration simulator | Yes | Unit + e2e | Demo controls |
| 22 | Stripe billing, test mode | Yes | Unit with a mocked Stripe. **Not tested against Stripe** | Simulated checkout in demo mode |
| 23 | Automated tests | Yes | — | 84 + 6 |
| 24 | Deployment documentation | Yes | — | Not exercised (nothing deployed) |

Definition of done (§22): every listed item is met in the demonstration environment.

## Open defects and gaps

| # | Item | Severity |
|---|---|---|
| 1 | Member with VaultLock **off** who loses every passkey cannot sign in (password reset does not remove the passkey requirement). No self-service fix | Medium |
| 2 | Account deletion is not built | Medium (legal) |
| 3 | Email bounce/complaint webhooks and Twilio inbound STOP are not synced to consent | Medium |
| 4 | No end-to-end test for the recovery pages or the password-reset pages (server logic is unit-tested) | Low |
| 5 | Session list / "sign out everywhere" not offered to the member | Low |
| 6 | Email change flow not built | Low |
| 7 | Embedded database (PGlite) crash-safety after a hard kill is not tested. It is for local demo only | Low |
| 8 | Reminders go to the member by email only (no SMS/push reminders) | Product gap |

## Outstanding security risks

See PRODUCTION_READINESS.md ("Known limitations") and THREAT_MODEL.md. The three largest: (1) an insider with database owner rights and the server secret; (2) a silent scheduler failure; (3) coercion of the member.

## Decisions made in this session (challenge freely)

| Decision | Reason |
|---|---|
| Built inside `dragon-phoenix-command/lifeline/` | It was the only repository in scope. **Recommended: move to its own repository** (separate product, separate security scope) |
| Own authentication instead of Supabase Auth | VaultLock rules are not expressible in a hosted auth product |
| Demo mode on by default; live sending needs three separate switches | A demo must never reach a real person by accident |
| scrypt instead of Argon2id | Built into Node, no native module; format allows later migration |
| Consent required for **all** channels including email | Stricter than the directive (SMS/voice only). Verifies the address and avoids unwanted contact |
| Acknowledgment stops later stages | Directive: "if the spouse does not acknowledge… alert a sibling" |
| A check-in after alerts sends an "all clear" notice to people already alerted | Honest about no recall; flagged for safety review (a forced check-in also sends it) |
| No fake Evidence Capture demo | A simulated "evidence preserved" screen could mislead |
| Interval change applies from the next check-in | Prevents an edit from firing an instant alert |

## Next actions (in order)

1. **Founder: run the demo locally** (`npm install && npm run dev`) and walk the 12 steps in the README.
2. **Founder decision:** approve a private HTTPS demo deployment (new Vercel project + Supabase, demo mode) so it can be tried on an iPhone. Then test on Safari iOS.
3. **Founder decision:** run the demand test (ROADMAP milestone 2) before any spend on security review or legal work.
4. Trademark search for "Lifeline" before any public use of the name.
5. Close open defect 1 (lost-passkey recovery when unsealed).
