# Roadmap

Rule for this roadmap: **prove that people want the core product before building more of it.** The MVP is built. The next question is commercial, not technical.

## Milestone 1 — Private HTTPS demo (days) — needs founder approval to deploy
- Separate Vercel project (root `lifeline/`) + Supabase database, demo mode on.
- Founder runs the 12-step demonstration on an iPhone with Face ID.
- Test on Safari iOS (not tested yet) and fix what breaks.

## Milestone 2 — Demand test (2–4 weeks, low cost)
- Show the demo to 15–20 people in the target groups (adult children of parents who live alone, solo travellers, people who live alone).
- Waitlist page live; measure sign-ups per visitor.
- Ask for a paid pre-order or a deposit. Interest without payment is weak evidence.
- **Decision gate:** continue only if a clear share of the people who see it try to pay. Otherwise stop or change the audience before spending on security review and legal work.

## Milestone 3 — Hardening (4–8 weeks, the expensive part)
- Everything under "Blockers" in PRODUCTION_READINESS.md.
- Trademark search (name risk: "Lifeline").
- Legal documents. Penetration test. Scheduler monitoring. Backups.
- Resend, Twilio and Stripe run in sandbox against the real services.

## Milestone 4 — Closed beta (real people, small number)
- Live email first; SMS and voice after 10DLC approval.
- Real billing in Stripe live mode with founder approval.
- Measure: activation, week-4 retention, false-alarm rate, Lifeline opt-out rate.

## Later (not started; each needs its own decision)
| Item | Depends on |
|---|---|
| Native iOS and Android apps (strict biometrics, push reminders, widgets) | Demand; the API is already separate (`src/server/api.ts`) |
| "I need help" button | Lifeline consent wording; safety review |
| ShadowMode: neutral notifications, minimal dashboard | Small; see SHADOWMODE.md |
| ShadowMode: duress passphrase | Independent threat model + specialist review |
| Emergency Evidence Capture | Native apps; legal review; see EVIDENCE_CAPTURE.md |
| Family plans, shared billing, family dashboard | Multi-user data model (today: one protected person per account) |
| Recovery guardians (multi-party approval) | Human-factors review |
| Business continuity plans (hand-over instructions) | Document storage + release rules; legal |
| Employer / lone-worker plans | Admin console that must not weaken VaultLock |
| Counselling and crisis-support referrals | Partnerships with licensed providers; never present Lifeline as counselling or dispatch |
