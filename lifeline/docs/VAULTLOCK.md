# VaultLock security model

## 1. Goal

After a member seals their plan, **being signed in is not enough to change it.** A person who has the unlocked phone, the password, the email inbox, or a stolen session cannot remove a Lifeline, redirect an alert, lengthen the schedule, or switch protection off.

## 2. What is sealed

| Sealed | Enforced by |
|---|---|
| Lifelines: add, remove, replace, name, email, phone, channels, order/stage, message | API check + `ll_guard_contacts` trigger |
| Interval, grace period, reminders, escalation mode, stage wait | API check + `ll_guard_protection` trigger |
| Pause, disable, return to set-up, delete protection | State machine + trigger |
| Check-in passphrase | API check + `ll_guard_users` trigger |
| Enrol or remove a passkey | `ll_guard_credentials` trigger |
| The sealed policy record | `ll_guard_policies` trigger (content never changes, never deleted) |
| Audit events, delivery history, incidents | Append-only triggers (always, sealed or not) |

Still allowed while sealed: a verified check-in; changing the sign-in password; a Lifeline changing **their own consent**; reading everything.

## 3. How a seal is made (`vaultlock.ts → seal`)

1. The session must have confirmed identity in the last 10 minutes: password + check-in passphrase + passkey.
2. Protection must be on, and at least one Lifeline must have accepted.
3. In one transaction, holding the protection row lock: read the live configuration → canonical JSON → SHA-256 hash → HMAC-SHA-256 with a key derived from `LIFELINE_SECRET` (the key is not in the database) → insert `sealed_policies` (versioned, links to the previous version's hash) → set `vaultlock_active`.
4. Return a recovery key (160 bits, shown once). Only a scrypt hash is stored.

## 4. Integrity verification (`verifySealed`)

Run on every dashboard load and **before every escalation**:

1. Stored policy text must match its hash and its HMAC → otherwise `policy_invalid`.
2. Live tables must match the sealed snapshot → otherwise `tamper_detected`, with the list of differing parts.

**Under VaultLock, escalation takes its recipients from the sealed snapshot, not from the live tables.** Rewriting the `contacts` table does not redirect an alert (tested; demonstrable with Demo controls 4). Consent is always read live, so an opt-out is honoured.

## 5. Exceptional recovery

A lock that can never be opened is itself dangerous (for example, a Lifeline becomes a threat). So:

1. **Start:** email + password + recovery key. Rate-limited. Failures are audited.
2. **Wait:** 72 hours by default (`RECOVERY_DELAY_SECONDS`). Nothing changes. The countdown and any alerts continue (tested).
3. **Notice through independent channels:** the member's email (with a one-click cancel link) and every consenting Lifeline are told that a release was requested.
4. **Cancel:** any signed-in session, or the emailed link. Cancelling keeps protection, so it is deliberately easy.
5. **Complete:** the same three items again, after the wait and within 7 further days. Result: VaultLock off, policy marked `released`, all other sessions ended, a new session that may enrol a device. The open incident, if any, is not touched.
6. A second "start" does not shorten the wait. The recovery key dies with the seal; a new seal makes a new key.

Email password reset is not part of this path. It changes the sign-in password only (tested).

Evaluated but **not built**: recovery guardians / multi-party approval, hardware-key-only recovery, and identity checks through a separate provider. See ROADMAP.md. They need human-factors review for coercion risk before design.

## 6. Trust boundaries — read this before making any claim

| Actor | Can they defeat VaultLock? |
|---|---|
| Person with the member's signed-in session | **No** (API + database guard) |
| Person with password and email access | **No** (needs passphrase + passkey for anything sensitive; recovery needs the recovery key) |
| Person with password + recovery key | Yes, after the delay, with notices sent, unless cancelled. This is the designed exit |
| Person who coerces the member in person | Partly. They can force a check-in. They cannot unseal without the recovery key and the wait. Coercion over 72+ hours is **not** prevented |
| Customer support using the application | **No.** There is no admin interface and no route that unseals |
| Engineer / attacker who can run SQL as the application's database role | They can set `lifeline.ctx = 'recovery'` and write. The HMAC then fails the integrity check **only if** they do not also hold `LIFELINE_SECRET`. Detected, not prevented |
| Database owner / superuser | Can drop triggers and rewrite rows. Audit chain and policy HMAC still expose the change unless they also hold `LIFELINE_SECRET` |
| Someone with database owner rights **and** `LIFELINE_SECRET` | **Yes, undetected.** Outside what this design can guarantee |

Honest wording that follows from this table:
- VaultLock is **tamper-resistant and tamper-evident**. It is not "immutable" and not "impossible to compromise".
- The database guards are **defence in depth against application bugs**. They are not a wall against an attacker who already has database access.
- Deleting the last N audit records **and** resetting the chain head is not detected today. Fix: publish chain heads to storage the application cannot write to (see PRODUCTION_READINESS.md).

## 7. Legal obligations that interact with the seal

- **Contact opt-out:** always works; changes consent fields only; cannot change an address (trigger-enforced, tested).
- **Account deletion while sealed:** must go through recovery first, so deletion cannot be a way to switch protection off. The final process needs legal review (GDPR/CCPA erasure timelines against a 72-hour delay).
- **Lifeline data erasure requests:** a Lifeline's opt-out stops all contact at once. Erasing their record from a sealed snapshot conflicts with integrity; needs legal review.
