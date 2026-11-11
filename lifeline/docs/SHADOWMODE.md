# ShadowMode — future architecture (NOT BUILT)

**Status: design notes only. No ShadowMode code exists. Nothing here may be described to customers as available.**

ShadowMode is for a member who may be watched, coerced or stalked. Goal: reduce what the app reveals and keep a quiet path to trusted people. It must never promise invisibility.

## 1. What cannot be hidden (say this to users)

| Trace | Why it stays |
|---|---|
| Browser history, autofill, saved passwords | Controlled by the browser. A "quick exit" button does not erase history |
| App installed on the phone; App Store / Play purchase history | Controlled by the OS and the store. Family Sharing shows purchases |
| Card or bank statement line | Controlled by the bank. A neutral billing descriptor helps; it does not hide the charge |
| Notifications, lock-screen previews, notification history | OS-controlled; the app can send neutral text or none |
| Device backups, screen-time / activity reports | OS-controlled |
| Monitoring software (stalkerware), shared Apple ID / Google account, router logs | Outside the app. If the device is compromised, the app cannot protect itself |
| Emails and texts from Lifeline in the member's inbox | Could be turned off or made neutral, at the cost of losing reminders |

The app must not try to bypass OS security or hide itself in prohibited ways (store rules forbid it).

## 2. Candidate capabilities and where they attach

| Capability | Attach point in today's code | Notes |
|---|---|---|
| Neutral notifications (no "Lifeline", no detail) | `templates.ts` + a per-user `discreet` flag read in `enqueue` | Low risk, high value. First candidate |
| Minimal dashboard (no names until identity is confirmed) | `protection.getState` returns a reduced view unless step-up is fresh | Small change; the step-up mechanism exists |
| Quick exit | Client only | Must state its limits on screen |
| Check-in from another trusted device | Already possible: any enrolled passkey | Needs a second enrolled device before sealing |
| Duress passphrase | `passkeys.verifyPresence` (see §3) | Highest risk; do not build without review |
| "I need help" action | New incident type in `engine.ts` with its own policy | Needs consent text changes for Lifelines |
| Location sharing | New, explicit, per-event consent; store minimum, expire fast | Privacy and stalking risk if misused. Probably native-only |

## 3. Duress check-in — design constraints

Idea: a second passphrase that looks like a normal check-in but tells the server the member may be under threat.

Rules any design must meet:

1. **The screen response must be identical** to a normal check-in: same text, same timing (within noise), same next-deadline display. Any difference is a signal to the coercer.
2. **A duress check-in must never weaken protection.** It may not cancel or silently pause anything. Open question: does the visible countdown reset (to look normal) while a hidden incident opens? That means the server holds two states: the one shown and the real one.
3. **What do Lifelines receive?** A duress alert states more than "a check-in was missed". That is a stronger claim with a higher cost if wrong (mistyped passphrase). Needs different consent, different wording, and guidance not to call or text the member's phone directly.
4. **False positives.** The two passphrases must be hard to confuse. A minimum edit distance and a confirmation step at set-up are needed. A way to stand down a false duress signal must itself be safe against coercion.
5. **Discoverability.** If the coercer can see that a duress passphrase is configured (settings screen, audit log, export, emails), the feature is dangerous. Storage, logs, the data export and the audit view all need a covert-data design.
6. **VaultLock interaction.** The duress passphrase is a credential: sealed with the plan, never changeable under coercion.
7. **Server enumeration.** `verifyPresence` must compare against both hashes in constant total time and rate-limit both together.

Open risks: retaliation if the coercer learns of the signal later (for example from a Lifeline's reaction); legal duty-of-care questions once the service "knows" about a possible emergency; misuse to cause false alarms.

**Gate before any build:** independent threat model; review by domestic-violence and personal-safety specialists; usability test with the intended users; legal review. Until then: not built, not marketed.

## 4. Suggested order

1. Neutral notification mode + minimal dashboard (low risk).
2. "I need help" action (explicit, visible, user-initiated).
3. Duress passphrase — only after the gate above.
4. Location sharing and native-only features.
