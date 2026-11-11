# Lifeline

> "Your Lifeline. Your Rules. Your Peace of Mind."

Lifeline is a check-in service. A member confirms "I'm OK" on a schedule. If a check-in is missed, the people the member chose ("Lifelines") are told. The countdown runs on the server, not on the phone.

**Status: DEMO-READY. Not PRODUCTION-READY.** This build must not be used for real safety. See [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md).

This folder is a self-contained application. It does not use, and is not used by, anything else in this repository.

## Run the demo (3 commands)

```bash
cd lifeline
npm install
npm run dev          # http://localhost:3000
```

No accounts, keys or database set-up are needed. Without a `DATABASE_URL` the app uses an embedded PostgreSQL (PGlite) stored in `lifeline/.data/`. Demo mode is on by default: **every email, text and call is simulated and reaches nobody.**

Passkeys (Face ID / fingerprint / device PIN) work on `http://localhost` and on any HTTPS address. To try the app on a real iPhone you need an HTTPS deployment (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)). In demo mode you can also skip the passkey; check-ins are then marked "simulated device".

## The 12-step founder demonstration

| # | Do this | Where |
|---|---|---|
| 1 | Create a demonstration account | `/register` |
| 2 | Add fictional Lifelines, then "accept for them now" | Onboarding step 4 |
| 3 | Choose a check-in interval | Onboarding step 5 |
| 4 | Turn protection on, then seal it with VaultLock (save the recovery key) | Security |
| 5 | Do a test check-in: "Verify I'm OK" | Home |
| 6 | Simulate the countdown expiring: "Jump past the deadline", then "Jump past the grace period" | Demo controls 1 |
| 7 | Read the generated alerts | Demo controls 2 (simulated inbox), Activity |
| 8 | Watch the escalation sequence: "Jump to the next escalation stage" | Demo controls 1 |
| 9 | Act as a Lifeline: open the `/ack/...` link in an alert and confirm receipt | Demo controls 2 |
| 10 | Attempt prohibited changes: "Attempt all changes" | Demo controls 3 |
| 11 | See each one refused ("Blocked by VaultLock", HTTP 423) | Demo controls 3 |
| 12 | Read the audit events, with chain verification | Security → Security log |

Extra: "Rewrite a Lifeline's email" (Demo controls 4) plays an attacker with database access. The dashboard then shows an integrity warning, and alerts still go to the sealed address.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server with the 15-second in-process scheduler |
| `npm run build` / `npm start` | Production build / run it |
| `npm test` | 84 server tests (Vitest) on embedded PostgreSQL |
| `TEST_DATABASE_URL=postgres://… npm run test:pg` | The same tests on a real PostgreSQL server (true concurrency) |
| `npm run e2e` | Browser tests (Playwright) against the production build. Run `npm run build` first |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |

## Layout

```
lifeline/
├── src/server/          Framework-free domain logic and HTTP API (no React, no Next.js imports)
│   ├── schema.ts        Database schema + database guards (triggers)
│   ├── api.ts           Every route: Request in, Response out. A native app would call the same routes.
│   ├── auth.ts          Accounts, sessions, password reset, identity confirmation ("step-up")
│   ├── passkeys.ts      WebAuthn enrolment and verification; verifyPresence() = passphrase + passkey
│   ├── statemachine.ts  The protection state machine (pure)
│   ├── protection.ts    Settings, arm, pause, the verified check-in
│   ├── engine.ts        Scheduler pass: reminders, deadlines, incidents, stages, outbox
│   ├── vaultlock.ts     Sealed policies, integrity checks, delayed recovery
│   ├── contacts.ts      Lifelines and their consent
│   ├── billing.ts       Plans, entitlements, Stripe test mode
│   ├── notify/          Outbox + provider adapters (simulated, Resend, Twilio)
│   └── audit.ts         Tamper-evident audit chain
├── src/app/             Next.js pages (marketing, auth, onboarding, app, consent, acknowledgment)
├── src/components/      UI components
├── tests/               Vitest suites (auth, countdown, notifications, VaultLock, billing)
├── e2e/                 Playwright suite (the full demonstration, phone + desktop)
└── docs/                Architecture, threat model, VaultLock, deployment, costs, roadmap, progress
```

## Documents

| Document | Content |
|---|---|
| [docs/PROGRESS.md](docs/PROGRESS.md) | What is done, test results, open defects, next actions |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, state machine, database, scheduler, billing-and-safety rule |
| [docs/VAULTLOCK.md](docs/VAULTLOCK.md) | VaultLock security model and trust boundaries |
| [docs/AUTH_AND_RECOVERY.md](docs/AUTH_AND_RECOVERY.md) | Authentication and recovery design |
| [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) | 15 attack scenarios: prevented / detected / not covered. OWASP ASVS self-check |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environment variables, Supabase, Vercel, scheduler, Resend, Twilio, Stripe |
| [docs/FINANCIAL_MODEL.md](docs/FINANCIAL_MODEL.md) | Cost and margin estimates at 100 / 1,000 / 10,000 paying users |
| [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) | Checklist, known limitations, what needs security and legal review |
| [docs/SHADOWMODE.md](docs/SHADOWMODE.md) | Future: ShadowMode and duress check-in architecture |
| [docs/EVIDENCE_CAPTURE.md](docs/EVIDENCE_CAPTURE.md) | Future: Emergency Evidence Capture feasibility + test plan |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Next milestones |

## Safety statements that the product must keep

- A missed check-in means only that a check-in was missed. It is not proof of harm.
- Lifeline is not an emergency service and does not contact emergency services.
- "Accepted by provider" is not "delivered to a person". A sent message cannot be recalled.
- No claim of "impossible to compromise", "immutable", "face-only" or "guaranteed".
