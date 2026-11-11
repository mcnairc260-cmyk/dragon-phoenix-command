// The whole HTTP API as one framework-free function: Request in, Response out.
// Next.js mounts it at /api/*; tests call it directly; a native app would use the same routes.
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHmac } from 'node:crypto';
import { ZodError, z } from 'zod';
import { LIMITS, config, setOriginStore } from './config';
import { audit, verifyChain } from './audit';
import * as auth from './auth';
import { handleStripeWebhook, plans, simulateBillingEvent, startCheckout } from './billing';
import * as contacts from './contacts';
import { safeEqual } from './crypto';
import { getDb, type Db } from './db';
import { timeTravel } from './demo';
import { ackInfo, acknowledge, recordDelivery, tick } from './engine';
import { AppError, fromDbError } from './errors';
import * as passkeys from './passkeys';
import * as protection from './protection';
import { rateLimit } from './ratelimit';
import * as vault from './vaultlock';

export const requestOrigin = new AsyncLocalStorage<string>();
setOriginStore(requestOrigin);
const COOKIE = 'll_session';

interface Ctx { db: Db; req: Request; url: URL; body: any; params: string[]; meta: auth.Meta; session: auth.Session; setCookie?: string }
type Handler = (c: Ctx) => Promise<unknown>;
type Access = 'public' | 'pending' | 'user';
const routes: { method: string; re: RegExp; access: Access; h: Handler }[] = [];
const route = (method: string, path: string, access: Access, h: Handler) =>
  routes.push({ method, re: new RegExp(`^${path.replace(/:\w+/g, '([^/]+)')}$`), access, h });

const cookie = (token: string, maxAge: number) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${config.appUrl.startsWith('https') ? '; Secure' : ''}`;
const status = async (c: Ctx) => (await c.db.query(`select status from protection where user_id = $1`, [c.session.userId]))[0].status as string;
const demoOnly = () => {
  if (!config.demoMode) throw new AppError('DEMO_ONLY', 'Only available in demonstration mode.');
};

// ---------------------------------------------------------------- account
route('POST', '/waitlist', 'public', async (c) => {
  await rateLimit(c.db, `waitlist:${c.meta.ip}`, 10, 3600);
  await c.db.query(`insert into waitlist (email, created_at) values ($1, now()) on conflict do nothing`, [auth.emailSchema.parse(c.body.email)]);
  return { ok: true };
});
route('GET', '/plans', 'public', async () => ({ plans: Object.values(plans()), provisional: true }));
route('POST', '/auth/register', 'public', async (c) => {
  const out = await auth.register(c.db, c.body, c.meta);
  c.setCookie = cookie(out.token, LIMITS.sessionAbsoluteSeconds);
  return { ok: true };
});
route('POST', '/auth/login', 'public', async (c) => {
  const out = await auth.login(c.db, c.body, c.meta);
  c.setCookie = cookie(out.token, LIMITS.sessionAbsoluteSeconds);
  return { mfaRequired: out.mfaRequired };
});
route('POST', '/auth/login/passkey/options', 'pending', async (c) => ({ options: await passkeys.assertionOptions(c.db, c.session, 'login') }));
route('POST', '/auth/login/passkey/verify', 'pending', async (c) => {
  await rateLimit(c.db, `mfa:${c.session.userId}`, 10, 900);
  await passkeys.verifyAssertion(c.db, c.session, 'login', c.body.assertion);
  await auth.completeMfa(c.db, c.session);
  return { ok: true };
});
route('POST', '/auth/logout', 'pending', async (c) => {
  await auth.logout(c.db, c.session);
  c.setCookie = cookie('', 0);
  return { ok: true };
});
route('POST', '/auth/verify-email', 'public', async (c) => (await auth.verifyEmail(c.db, String(c.body.token)), { ok: true }));
route('POST', '/auth/verify-email/resend', 'user', async (c) => (await auth.resendVerification(c.db, c.session), { ok: true }));
route('POST', '/auth/password/forgot', 'public', async (c) => (await auth.requestPasswordReset(c.db, c.body.email, c.meta), { ok: true }));
route('POST', '/auth/password/reset', 'public', async (c) => (await auth.resetPassword(c.db, String(c.body.token), c.body.password), { ok: true }));
route('POST', '/auth/passphrase', 'user', async (c) => (await auth.setPassphrase(c.db, c.session, c.body.passphrase, await status(c)), { ok: true }));
route('POST', '/auth/stepup/options', 'user', async (c) => ({ options: await passkeys.assertionOptions(c.db, c.session, 'stepup') }));
route('POST', '/auth/stepup', 'user', async (c) => {
  await auth.verifyPassword(c.db, c.session, c.body.password);
  if (c.session.hasPassphrase) await passkeys.verifyPresence(c.db, c.session, c.body, 'stepup');
  await auth.markStepUp(c.db, c.session);
  return { ok: true };
});
route('GET', '/me', 'user', (c) => protection.getState(c.db, c.session));
route('GET', '/export', 'user', async (c) => ({
  account: (await c.db.query(`select email, name, created_at, plan, sub_status from users where id = $1`, [c.session.userId]))[0],
  state: await protection.getState(c.db, c.session),
  auditEvents: await c.db.query(`select type, actor, detail, created_at from audit_events where user_id = $1 order by seq`, [c.session.userId]),
}));

// ---------------------------------------------------------------- passkeys
route('POST', '/passkeys/options', 'user', async (c) => ({ options: await passkeys.registrationOptions(c.db, c.session) }));
route('POST', '/passkeys', 'user', async (c) => (await passkeys.verifyRegistration(c.db, c.session, c.body.response, String(c.body.label ?? ''), await status(c)), { ok: true }));
route('DELETE', '/passkeys/:id', 'user', async (c) => {
  const list = await passkeys.listPasskeys(c.db, c.session.userId);
  if (!config.demoMode && list.length <= 1 && (await status(c)) !== 'setup') throw new AppError('CONFLICT', 'Enroll another passkey before you remove your last one.');
  await passkeys.removePasskey(c.db, c.session, c.params[0]);
  return { ok: true };
});

// ---------------------------------------------------------------- Lifelines
route('GET', '/contacts', 'user', async (c) => ({ contacts: await contacts.listContacts(c.db, c.session.userId) }));
route('POST', '/contacts', 'user', async (c) => ({ id: await contacts.addContact(c.db, c.session, c.body) }));
route('PUT', '/contacts/:id', 'user', async (c) => (await contacts.updateContact(c.db, c.session, c.params[0], c.body), { ok: true }));
route('DELETE', '/contacts/:id', 'user', async (c) => (await contacts.removeContact(c.db, c.session, c.params[0]), { ok: true }));
route('GET', '/consent/:token', 'public', (c) => contacts.consentInfo(c.db, c.params[0]));
route('POST', '/consent/:token', 'public', async (c) => {
  await rateLimit(c.db, `consent:${c.meta.ip}`, 30, 900);
  return contacts.decideConsent(c.db, c.params[0], z.enum(['grant', 'decline', 'revoke']).parse(c.body.decision), c.body.channels, c.meta);
});
route('GET', '/ack/:token', 'public', (c) => ackInfo(c.db, c.params[0]));
route('POST', '/ack/:token', 'public', async (c) => {
  await rateLimit(c.db, `ack:${c.meta.ip}`, 30, 900);
  return acknowledge(c.db, c.params[0]);
});

// ---------------------------------------------------------------- protection
route('PUT', '/protection/settings', 'user', async (c) => (await protection.updateSettings(c.db, c.session, c.body), { ok: true }));
route('POST', '/protection/arm', 'user', async (c) => (await protection.arm(c.db, c.session), { ok: true }));
route('POST', '/protection/pause', 'user', async (c) => (await protection.pause(c.db, c.session), { ok: true }));
route('POST', '/protection/resume', 'user', async (c) => (await protection.resume(c.db, c.session), { ok: true }));
route('POST', '/checkin/options', 'user', async (c) => ({ options: await passkeys.assertionOptions(c.db, c.session, 'checkin') }));
// Only the passphrase and the passkey assertion are read. Any timestamp a client adds is ignored.
route('POST', '/checkin', 'user', (c) => protection.checkIn(c.db, c.session, { passphrase: c.body.passphrase, assertion: c.body.assertion }));

// ---------------------------------------------------------------- VaultLock
route('POST', '/vaultlock/seal', 'user', (c) => vault.seal(c.db, c.session, c.body.acknowledged === true));
route('POST', '/vaultlock/recovery/start', 'public', (c) => vault.startRecovery(c.db, c.body, c.meta));
route('POST', '/vaultlock/recovery/complete', 'public', async (c) => {
  const out = await vault.completeRecovery(c.db, c.body, c.meta);
  if (!out.expired) c.setCookie = cookie(out.token, LIMITS.sessionAbsoluteSeconds);
  return { released: !out.expired, expired: out.expired };
});
route('POST', '/vaultlock/recovery/cancel', 'user', async (c) => ({ cancelled: await vault.cancelRecovery(c.db, c.session) }));
route('POST', '/vaultlock/recovery/cancel-token', 'public', async (c) => ({ cancelled: await vault.cancelRecoveryByToken(c.db, String(c.body.token)) }));

// ---------------------------------------------------------------- history
const HIDDEN_BODY = ['consent_request', 'alert', 'all_clear', 'recovery_notice'];
route('GET', '/history', 'user', async (c) => {
  const rows = await c.db.query(
    `select n.id, n.kind, n.channel, n.recipient, n.subject, n.body, n.stage, n.status, n.attempts, n.simulated, n.provider, n.last_error,
            n.created_at, n.sent_at, n.acknowledged_at, n.incident_id, n.contact_id, c.name as contact_name
       from notifications n left join contacts c on c.id = n.contact_id where n.user_id = $1 order by n.created_at desc, n.id limit 200`, [c.session.userId]);
  // Outside demo mode the member never sees message bodies meant for a Lifeline: they hold that person's private links.
  return { demoMode: config.demoMode, notifications: rows.map((n) => (!config.demoMode && n.contact_id && HIDDEN_BODY.includes(n.kind) ? { ...n, body: null } : n)) };
});
route('GET', '/audit', 'user', async (c) => ({
  chain: await verifyChain(c.db, c.session.userId),
  events: await c.db.query(`select seq, actor, type, detail, created_at, hash from audit_events where chain = $1 order by seq desc limit 200`, [c.session.userId]),
}));

// ---------------------------------------------------------------- billing
route('POST', '/billing/checkout', 'user', (c) => startCheckout(c.db, c.session, c.body.plan));
route('POST', '/demo/billing', 'user', async (c) => (await simulateBillingEvent(c.db, c.session, c.body.event), { ok: true }));

// ---------------------------------------------------------------- demonstration controls
route('POST', '/demo/jump', 'user', (c) => timeTravel(c.db, c.session, z.enum(['reminder', 'deadline', 'grace', 'stage', 'recovery']).parse(c.body.jump)));
route('POST', '/demo/tick', 'user', async (c) => (demoOnly(), tick(c.db)));
route('POST', '/demo/tamper', 'user', async (c) => {
  // Shows tamper detection: plays the part of someone with direct database access who rewrites a sealed Lifeline's email.
  demoOnly();
  await c.db.tx(async (q) => {
    await q.query(`update contacts set email = 'attacker@example.invalid' where id = (select id from contacts where user_id = $1 and removed_at is null order by stage, priority limit 1)`, [c.session.userId]);
    await audit(q, { userId: c.session.userId, actor: 'demo', type: 'demo.simulated_database_tampering' });
  }, 'recovery');
  return { ok: true };
});

// ---------------------------------------------------------------- machine callers
route('POST', '/cron/tick', 'public', async (c) => {
  const secret = config.cronSecret;
  const given = c.req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!secret || !safeEqual(given, secret)) throw new AppError('FORBIDDEN', 'Not allowed.');
  return tick(c.db);
});
routes.push({ ...routes[routes.length - 1], method: 'GET' }); // Vercel Cron calls with GET
route('POST', '/webhooks/stripe', 'public', (c) => handleStripeWebhook(c.db, c.body.__raw, c.req.headers.get('stripe-signature')));
route('POST', '/webhooks/twilio', 'public', async (c) => {
  const t = config.twilio;
  if (!t) throw new AppError('NOT_READY', 'Twilio is not configured.');
  const params = new URLSearchParams(c.body.__raw);
  const data = `${config.appUrl}/api/webhooks/twilio` + [...params.keys()].sort().map((k) => k + params.get(k)).join('');
  if (!safeEqual(createHmac('sha1', t.token).update(data).digest('base64'), c.req.headers.get('x-twilio-signature') ?? '')) throw new AppError('FORBIDDEN', 'Bad signature.');
  await recordDelivery(c.db, params.get('MessageSid') ?? params.get('CallSid') ?? '', params.get('MessageStatus') ?? params.get('CallStatus') ?? '');
  return { ok: true };
});

const MACHINE = /^\/(webhooks|cron)\//;

export async function handleApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto');
  const origin = process.env.APP_URL?.trim() || `${proto ?? url.protocol.replace(':', '')}://${req.headers.get('host') ?? url.host}`;
  return requestOrigin.run(origin, async () => {
    const path = url.pathname.replace(/^\/api/, '') || '/';
    const json = (data: unknown, code = 200, setCookie?: string) =>
      new Response(JSON.stringify(data), { status: code, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...(setCookie ? { 'set-cookie': setCookie } : {}) } });
    try {
      const m = routes.map((r) => ({ r, hit: r.method === req.method && path.match(r.re) })).find((x) => x.hit);
      if (!m) throw new AppError('NOT_FOUND', 'Not found.');
      // CSRF: the cookie is SameSite=Strict, and a browser request that changes state must come from our own origin.
      const from = req.headers.get('origin');
      if (req.method !== 'GET' && !MACHINE.test(path) && from && from !== config.appUrl) throw new AppError('FORBIDDEN', 'Cross-site request refused.');
      const raw = req.method === 'GET' ? '' : await req.text();
      if (raw.length > 100_000) throw new AppError('BAD_REQUEST', 'Request too large.');
      let body: any = {};
      if (MACHINE.test(path)) body = { __raw: raw };
      else if (raw) {
        try { body = JSON.parse(raw); } catch { throw new AppError('BAD_REQUEST', 'Invalid JSON.'); }
        if (!body || typeof body !== 'object') throw new AppError('BAD_REQUEST', 'Invalid JSON.');
      }
      const db = await getDb();
      const token = (req.headers.get('cookie') ?? '').split(/;\s*/).find((p) => p.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
        ?? req.headers.get('authorization')?.match(/^Session (.+)$/)?.[1];
      const session = m.r.access === 'public' ? null : await auth.getSession(db, token);
      if (m.r.access !== 'public') {
        if (!session) throw new AppError('UNAUTHENTICATED', 'Sign in to continue.');
        if (session.pendingMfa && m.r.access !== 'pending') throw new AppError('UNAUTHENTICATED', 'Finish signing in with your passkey.');
      }
      const c: Ctx = { db, req, url, body, params: (m.hit as RegExpMatchArray).slice(1), session: session!,
        meta: { ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local', userAgent: req.headers.get('user-agent') ?? '' } };
      const out = await m.r.h(c);
      return json(out ?? { ok: true }, 200, c.setCookie);
    } catch (e) {
      const err = e instanceof AppError ? e : fromDbError(e);
      if (err) return json({ error: { code: err.code, message: err.message } }, err.status);
      if (e instanceof ZodError) return json({ error: { code: 'BAD_REQUEST', message: e.issues[0]?.message ?? 'Invalid input.' } }, 400);
      console.error('[lifeline] unhandled API error', e);
      return json({ error: { code: 'INTERNAL', message: 'Something went wrong. Nothing was changed.' } }, 500);
    }
  });
}
