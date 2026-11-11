# Deployment and integration set-up

**Nothing here has been deployed.** Deploying, connecting live providers, and turning on billing each need the founder's explicit approval. Order below is the recommended order.

## 0. Environment variables

The complete list with comments is in [`.env.example`](../.env.example). Required when demo mode is off: `APP_URL`, `LIFELINE_SECRET`, `DATABASE_URL`, `CRON_SECRET`.

## 1. A private HTTPS demo (recommended next step)

Goal: the founder can open the demo on an iPhone with real Face ID passkeys. Still demo mode: nothing is sent.

1. **Database (Supabase):** create a project. Copy the *Session pooler* connection string into `DATABASE_URL`. The app creates its tables on first start. (Free tier is enough for a demo; it pauses after inactivity.)
2. **Hosting (Vercel):** create a **new** Vercel project from this repository with **Root Directory = `lifeline`**. Do not change the existing root project. Framework preset: Next.js.
3. **Variables:** `LIFELINE_DEMO_MODE=1`, `APP_URL=https://<your-vercel-domain>`, `DATABASE_URL`, `LIFELINE_SECRET` (`openssl rand -base64 48`), `CRON_SECRET` (`openssl rand -hex 32`).
4. **Scheduler:** serverless has no background timer, so something must call the tick endpoint every minute:
   - Vercel Cron (Pro plan; the Hobby plan allows only daily jobs) with `vercel.json` in `lifeline/`: `{"crons":[{"path":"/api/cron/tick","schedule":"* * * * *"}]}`. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set; **or**
   - Supabase `pg_cron` + `pg_net`: `select cron.schedule('lifeline-tick','* * * * *', $$select net.http_get('https://<domain>/api/cron/tick', headers:='{"Authorization":"Bearer <CRON_SECRET>"}'::jsonb)$$);` **or**
   - any external scheduler that can send the header.
   In demo mode the Demo controls also run the scheduler on each jump, so a demo works even before step 4.
5. Open the URL on the phone, register, enrol a passkey with Face ID.

`APP_URL` must be the exact origin people use. Passkeys are bound to that hostname; changing the domain later invalidates every enrolled passkey.

## 2. Email (Resend) — sandbox first

1. Create a Resend account, verify a sending domain (SPF, DKIM, DMARC).
2. Set `RESEND_API_KEY`, `EMAIL_FROM`.
3. Live sending needs `LIFELINE_DEMO_MODE=0` **and** `LIFELINE_LIVE_EMAIL=1`. Keep the flag at 0 until the test below is done.
4. Test with Resend's test addresses (`delivered@resend.dev`, `bounced@resend.dev`) as Lifeline emails.

Status: adapter **IMPLEMENTED, NOT TESTED** against the live API. Bounce/complaint webhooks are not handled yet.

## 3. SMS and voice (Twilio) — test credentials first

1. Twilio account; buy a number; complete **A2P 10DLC** brand and campaign registration (required for US application-to-person SMS; takes days to weeks).
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`. Use Twilio **test credentials** and magic numbers first.
3. Status callback URL is sent with each message: `https://<domain>/api/webhooks/twilio` (signature-checked).
4. Live flags: `LIFELINE_LIVE_SMS=1`, `LIFELINE_LIVE_VOICE=1`.
5. Inbound "STOP" handling: Twilio blocks further messages itself; syncing that into `contacts.consent_status` is **not built**.

Status: adapter **IMPLEMENTED, NOT TESTED** against the live API. US automated calls and texts fall under the TCPA: legal review before any live use.

## 4. Billing (Stripe test mode)

1. In Stripe **test mode** create two recurring prices; set `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PREMIUM`.
2. Set `STRIPE_SECRET_KEY` (`sk_test_…`). A live key makes the app refuse to start billing unless `LIFELINE_ALLOW_LIVE_BILLING=1`.
3. Webhook endpoint `https://<domain>/api/webhooks/stripe`; events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`. Set `STRIPE_WEBHOOK_SECRET`.
4. Test with card `4242 4242 4242 4242`, and `4000 0000 0000 0341` for a failed renewal.

Status: Checkout creation and signed webhooks are **TESTED with a mocked Stripe** (request shape, signature, replay). **NOT TESTED** against Stripe's servers. No customer portal, no proration, no tax.

## 5. Self-hosting instead of Vercel

`npm run build && npm start` on any Node 20.9+ host with `DATABASE_URL` set. The in-process scheduler runs every 15 seconds; with more than one instance this is safe (the engine is idempotent) but wasteful — set `LIFELINE_DISABLE_LOCAL_SCHEDULER=1` on all but one, or use the cron endpoint.

## 6. Before any deployment that real people could rely on

Complete [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md). In particular: scheduler heartbeat monitoring, database backups with point-in-time recovery, secret storage, an incident response plan, the independent security assessment, and legal review.
