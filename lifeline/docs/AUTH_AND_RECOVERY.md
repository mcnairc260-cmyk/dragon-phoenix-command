# Authentication and recovery design

## Secrets and what each one can do

| Secret | Stored as | Proves | Alone, it allows |
|---|---|---|---|
| Sign-in password (10+ chars) | scrypt hash | Knowledge | Sign-in only if no passkey is enrolled. Never a check-in, never a sensitive change |
| Passkey (WebAuthn, user verification required) | Public key only | Possession of the device + the device's own check (Face ID, fingerprint or **device PIN**) | Nothing alone |
| Check-in passphrase (8+ chars, must differ from the password) | scrypt hash | Knowledge, separate from the password | Nothing alone |
| Recovery key (160-bit, shown once at sealing) | scrypt hash | Possession of something kept off the phone | Nothing alone |

Lifeline never receives or stores a face image, fingerprint or biometric template. **A web passkey can be satisfied with the device PIN. The product does not claim "face-only" verification.** Strict face-only checks need native apps (iOS `LAContext` with `.biometryCurrentSet`, Android `BiometricPrompt` Class 3) plus key attestation; even then the platform decides the fallback rules. See ROADMAP.md.

## Operations and required proof

| Operation | Proof |
|---|---|
| Sign in | Password, then passkey if one is enrolled (two steps; the first step gives a 5-minute session that can only finish sign-in) |
| Check in | Passphrase **and** passkey assertion (`verifyPresence`). Demo mode without a passkey: passphrase only, recorded as "simulated" |
| Change settings before protection is on | Session |
| Change settings after protection is on (unsealed) | "Step-up": password + passphrase + passkey, valid 10 minutes |
| Change sealed settings | Not possible. Recovery only |
| Turn protection on (demo mode off) | Requires an enrolled passkey |

## Controls implemented

- **Challenges:** single-use, bound to one session and one purpose (`login`, `checkin`, `stepup`, `register`), 5-minute life, marked used before the signature is checked. A replayed, cross-purpose, cross-session or expired assertion fails (tested).
- **Sessions:** 256-bit random token; only its SHA-256 is stored. 30-minute idle limit, 12-hour absolute limit, revoked on sign-out, on password reset and on recovery (tested).
- **Rate limits (database-backed):** sign-in per email and per IP, passphrase attempts, step-up password, registration, password reset, recovery, consent and acknowledgment pages.
- **Enumeration:** sign-in and password reset give the same answer for unknown accounts; a dummy hash is computed so timing is similar.
- **CSRF:** `SameSite=Strict` cookie plus an Origin check on every state-changing request.
- **New-browser notice:** sign-in from a browser not seen before is audited and the member is emailed.
- **Audit:** every sign-in, failure, step-up, enrolment, blocked attempt and recovery step is written to the tamper-evident chain.

## Known gaps

- No account lockout notice to the member after repeated failures (rate limit only).
- Passphrase guessing limit (6 per 15 minutes) can also lock the real member out for 15 minutes. Direction of failure: an alert may fire. Accepted for now; needs review.
- "New device" detection uses the user-agent string only. Weak signal.
- No device attestation; any passkey provider is accepted (including synced passkeys, which are not device-bound). Device-bound enforcement needs attestation policy or native apps.
- No breached-password check at registration.
- Recovery when VaultLock is **off** and all passkeys are lost is not built (support process needed).
