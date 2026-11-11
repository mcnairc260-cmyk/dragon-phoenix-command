# Architecture

## 1. Shape

One Next.js application. One PostgreSQL database. No microservices, no queue service.

```
Browser / future native app
        │  HTTPS, JSON, session cookie (HttpOnly, SameSite=Strict)
        ▼
src/server/api.ts  ── handleApi(Request) → Response      (mounted by Next.js at /api/*)
        │
        ├── auth.ts, passkeys.ts      who is this, and did they just prove it
        ├── protection.ts             settings, arm, pause, check-in
        ├── contacts.ts               Lifelines + consent
        ├── vaultlock.ts              seal, verify, delayed recovery
        ├── billing.ts                plans, Stripe test mode
        └── engine.ts ◄── scheduler   tick(): reminders → deadlines → incidents → stages → outbox
                 │
                 ▼
        notify/providers.ts           simulated | Resend | Twilio
        │
        ▼
PostgreSQL  (schema + guard triggers in src/server/schema.ts)
```

`src/server/` imports nothing from React or Next.js. Tests call `handleApi` directly. A future iOS or Android app uses the same routes (send the session token as `Authorization: Session <token>`).

## 2. Protection state machine (`statemachine.ts`)

```
setup ──ARM──▶ active ──DEADLINE_PASSED──▶ grace ──GRACE_EXPIRED──▶ escalating
                 ▲  ▲                        │                          │
                 │  └────────CHECK_IN────────┘                          │
                 └──────────────────CHECK_IN────────────────────────────┘
active|grace ──PAUSE──▶ paused ──RESUME──▶ active     (PAUSE is never allowed while VaultLock is active)
```

- Each ARM, RESUME and CHECK_IN starts a new **cycle** (a counter) and sets `deadline_at = server time + interval`.
- `escalating` has one open **incident**. `unique (user_id, cycle)` makes a second incident for the same cycle impossible.
- The request body of a check-in carries a passphrase and a passkey assertion. There is no timestamp field. Extra fields are ignored (tested).

## 3. The scheduler (`engine.ts`)

The engine has no in-memory jobs. All timing lives in database rows (`protection.deadline_at`, `incidents.next_stage_at`, `notifications.next_attempt_at`). `tick()` reads what is due and acts. This gives the required properties:

| Requirement | How |
|---|---|
| Runs with the app closed / phone off | Nothing in `tick()` depends on a client |
| Survives a worker crash or outage | The next `tick()` finds the same due rows and continues ("catch-up" test) |
| No duplicate escalation | Each step re-checks its condition while holding `SELECT … FOR UPDATE`; incidents and messages have unique keys |
| Check-in and deadline at the same moment | Both lock the protection row. One runs first; the other sees the new state |
| Many workers at once | Outbox claim uses `FOR UPDATE SKIP LOCKED` |
| A worker dies mid-send | A message left in `sending` for 5 minutes goes back to `queued` (at-least-once; the provider gets the same idempotency key) |
| One bad account | Each account is processed in its own transaction; errors are collected, the pass continues |

Who calls `tick()`:
- **Local / self-hosted:** `src/instrumentation.ts` runs it every 15 seconds inside the server process.
- **Serverless (Vercel):** an external scheduler calls `GET /api/cron/tick` with `Authorization: Bearer $CRON_SECRET` once per minute. See DEPLOYMENT.md. **This scheduler is the single most important production component: if it stops, no alert is sent.** It needs its own monitoring (a "dead man's switch" on the scheduler itself).

## 4. Notifications

- `enqueue()` writes to the `notifications` table (the outbox) inside the same transaction as the state change. `dedupe_key` is unique, so a repeated step cannot create a second message.
- Statuses: `queued → sending → accepted → delivered` or `failed`; `cancelled` (stopped before sending); `suppressed` (deliberately not sent, with the reason, for example no consent).
- `accepted` = the provider took it. `delivered` is set only by a provider webhook. The UI says this.
- Retries: 4 attempts, backoff 30 s × 4ⁿ. After the cap: `failed` + audit event `notification.failed`.
- Consent is read at queue time **and again at send time**. An opt-out between the two cancels the message.
- Live sending needs three things at once: demo mode off, the channel flag (`LIFELINE_LIVE_EMAIL` …) on, and credentials. Otherwise the simulated provider is used. Tested.

## 5. Database (PostgreSQL)

Tables: `users`, `sessions`, `auth_tokens`, `webauthn_credentials`, `webauthn_challenges`, `rate_limits`, `protection`, `contacts`, `sealed_policies`, `recovery_requests`, `incidents`, `notifications`, `audit_events`, `audit_heads`, `waitlist`, `stripe_events`. Full definitions: `src/server/schema.ts`.

Guards (triggers), second line behind the API checks:
- `contacts`, `protection`, `users.checkin_secret_hash`, `webauthn_credentials`: changes rejected while VaultLock is active, except inside a `recovery` transaction, or a `consent` transaction that changes consent columns only.
- `sealed_policies`: content never changes; never deleted.
- `audit_events`: no UPDATE, DELETE or TRUNCATE. `notifications`, `incidents`, `contacts`: no DELETE.
- The guard function takes the protection row lock before it reads the VaultLock flag. This closes a race between sealing and a concurrent edit (found by running the tests on real PostgreSQL).

Not done (see PRODUCTION_READINESS.md): row-level security policies and separate database roles. Today the application is the only database client and every query is scoped by `user_id` (tested: "data isolation").

## 6. Billing and safety

**Rule: billing code never touches the engine.** `billing.ts` writes `users.plan` and `users.sub_status` only. `engine.ts` never reads `sub_status`. A failed payment or a cancelled subscription cannot stop a countdown (tested). Plans limit what can be *configured*; monthly SMS/voice caps limit cost at send time, and email is still sent when a cap is reached.

The policy for ending service after long non-payment (notice to the member, then to Lifelines, then stop) is a business and legal decision. It is not implemented.

## 7. Technology choices and why

| Choice | Reason |
|---|---|
| Next.js 16 + React + TypeScript + Tailwind 4 | The stack named in the directive |
| Own auth, not Supabase Auth | VaultLock needs authorization rules that a hosted auth product does not expose (sealed credentials, password reset that cannot unlock, step-up with passphrase + passkey). The database can still be Supabase |
| `pg` driver + plain SQL | Row locks, `SKIP LOCKED`, triggers and transaction-local settings are used directly. An ORM would hide them |
| PGlite (embedded PostgreSQL) for local demo and tests | Zero set-up for a solo founder; the same SQL and triggers run. Real PostgreSQL is used for concurrency tests and production |
| scrypt (Node built-in), N = 2¹⁷ | Memory-hard, no native dependency. The hash format carries its algorithm, so a move to Argon2id needs no migration |
| `@simplewebauthn` | Maintained WebAuthn library; no hand-written signature verification |
| Stripe / Resend / Twilio through `fetch` | Three small adapters instead of three SDKs |
| Database-backed rate limits | Work across serverless instances with no extra service |
