import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { config } from '@/server/config';
import { DAY, HOUR, addLifeline, alerts, armed, call, newUser, one, sealVault, settle, state, travel, testDb } from './helpers';

testDb();

describe('plan entitlements', () => {
  it('Basic: 2 Lifelines, email only, no custom escalation', async () => {
    const u = await newUser();
    await addLifeline(u); await addLifeline(u);
    const third = await call('POST', '/contacts', { name: 'Third', email: 'third@example.test', channels: ['email'] }, u.cookie);
    expect([third.status, third.data.error.code]).toEqual([402, 'PLAN_LIMIT']);
    const u2 = await newUser();
    expect((await call('POST', '/contacts', { name: 'Sms', email: 's@example.test', phone: '+12055550123', channels: ['email', 'sms'] }, u2.cookie)).status).toBe(402);
    expect((await call('PUT', '/protection/settings', { escalationMode: 'custom' }, u2.cookie)).status).toBe(402);
    expect((await call('PUT', '/protection/settings', { reminderOffsets: [3600, 7200, 10800] }, u2.cookie)).status).toBe(402);
  });

  it('Premium (simulated checkout in demo mode) unlocks SMS, voice and custom stages', async () => {
    const u = await newUser();
    const co = await call('POST', '/billing/checkout', { plan: 'premium' }, u.cookie);
    expect(co.data.simulated).toBe(true);
    expect((await state(u)).user).toMatchObject({ plan: 'premium', subStatus: 'active_simulated' });
    const c = await addLifeline(u, { phone: '+12055550123', channels: ['email', 'sms', 'voice'] }, 'none');
    await call('POST', `/consent/${c.token}`, { decision: 'grant', channels: ['email', 'sms'] }); // the Lifeline declines calls
    await call('PUT', '/protection/settings', { intervalSeconds: DAY, graceSeconds: HOUR, reminderOffsets: [] }, u.cookie);
    await call('POST', '/protection/arm', {}, u.cookie);
    travel(DAY + HOUR + 60); await settle();
    const a = await alerts(u.userId);
    expect(a.find((x) => x.channel === 'email').status).toBe('accepted');
    expect(a.find((x) => x.channel === 'sms')).toMatchObject({ status: 'accepted', simulated: true, recipient: '+12055550123' });
    expect(a.find((x) => x.channel === 'voice').status).toBe('suppressed'); // consent is per channel
  });

  it('VaultLock is available on the Basic plan', async () => {
    const u = await armed(1);
    expect((await state(u)).user.plan).toBe('basic');
    expect(await sealVault(u)).toBeTruthy();
  });

  it('rejects a phone number that is not in international format', async () => {
    const u = await newUser();
    await call('POST', '/billing/checkout', { plan: 'premium' }, u.cookie);
    expect((await call('POST', '/contacts', { name: 'P', email: 'p@example.test', phone: '555-1234', channels: ['sms'] }, u.cookie)).status).toBe(400);
  });
});

describe('billing never switches protection off', () => {
  it('a failed payment or a cancelled subscription leaves the countdown and alerts running', async () => {
    const u = await armed(1, { intervalSeconds: DAY, graceSeconds: HOUR, reminderOffsets: [] });
    await call('POST', '/demo/billing', { event: 'payment_failed' }, u.cookie);
    expect((await state(u)).user.subStatus).toBe('past_due');
    expect((await state(u)).protection.status).toBe('active');
    await call('POST', '/demo/billing', { event: 'cancelled' }, u.cookie);
    travel(DAY + HOUR + 60); await settle();
    expect((await one(`select status from protection where user_id = $1`, [u.userId])).status).toBe('escalating');
    expect((await alerts(u.userId)).filter((a) => a.status === 'accepted').length).toBe(1);
  });
});

describe('Stripe (test mode) wiring', () => {
  const env = { STRIPE_SECRET_KEY: 'sk_test_123', STRIPE_WEBHOOK_SECRET: 'whsec_test', STRIPE_PRICE_BASIC: 'price_b', STRIPE_PRICE_PREMIUM: 'price_p' };
  const sign = (payload: string, secret = env.STRIPE_WEBHOOK_SECRET, t = Math.floor(Date.now() / 1000)) =>
    `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;
  const withStripe = async (fn: () => Promise<void>) => {
    Object.assign(process.env, env);
    try { await fn(); } finally { for (const k of Object.keys(env)) delete process.env[k]; }
  };

  it('refuses a live secret key unless live billing was explicitly allowed', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
    try {
      expect(() => config.stripe).toThrow(/Refusing to charge real cards/);
    } finally { delete process.env.STRIPE_SECRET_KEY; }
  });

  it('accepts a correctly signed webhook once, and rejects forged, stale and replayed ones', () => withStripe(async () => {
    const u = await newUser();
    const event = (id: string, type: string, object: object) => JSON.stringify({ id, type, data: { object } });
    const done = event('evt_1', 'checkout.session.completed', { client_reference_id: u.userId, customer: 'cus_1', subscription: 'sub_1', metadata: { plan: 'premium' } });
    const post = (payload: string, sig: string) => call('POST', '/webhooks/stripe', payload, undefined, { 'stripe-signature': sig });
    expect((await post(done, sign(done, 'whsec_wrong'))).status).toBe(403);
    expect((await post(done, sign(done, undefined, Math.floor(Date.now() / 1000) - 3600))).status).toBe(403);
    expect((await post(done.replace('premium', 'premium '), sign(done))).status).toBe(403);
    expect((await one(`select plan from users where id = $1`, [u.userId])).plan).toBe('basic');
    expect((await post(done, sign(done))).status).toBe(200);
    expect(await one(`select plan, sub_status, stripe_customer_id from users where id = $1`, [u.userId])).toEqual({ plan: 'premium', sub_status: 'active', stripe_customer_id: 'cus_1' });
    expect((await post(done, sign(done))).data.duplicate).toBe(true);
    const failed = event('evt_2', 'invoice.payment_failed', { customer: 'cus_1' });
    await post(failed, sign(failed));
    expect((await one(`select sub_status, plan from users where id = $1`, [u.userId]))).toEqual({ sub_status: 'past_due', plan: 'premium' });
  }));

  it('creates a Checkout session with the test key and the configured price', () => withStripe(async () => {
    const u = await newUser();
    const realFetch = globalThis.fetch;
    let seen: { url: string; auth: string; body: string } | null = null;
    globalThis.fetch = (async (url: string, init: any) => {
      seen = { url, auth: init.headers.authorization, body: String(init.body) };
      return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' }), { status: 200 });
    }) as any;
    try {
      const r = await call('POST', '/billing/checkout', { plan: 'premium' }, u.cookie);
      expect(r.data).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_test_1', simulated: false });
      expect(seen!.url).toBe('https://api.stripe.com/v1/checkout/sessions');
      expect(seen!.auth).toBe('Bearer sk_test_123');
      expect(seen!.body).toContain('price_p');
      expect((await state(u)).user.plan).toBe('basic'); // the plan changes only when the signed webhook arrives
    } finally { globalThis.fetch = realFetch; }
  }));
});

describe('machine endpoints', () => {
  it('the scheduler endpoint needs the cron secret', async () => {
    expect((await call('POST', '/cron/tick', '')).status).toBe(403);
    process.env.CRON_SECRET = 'cron-secret-value';
    try {
      expect((await call('POST', '/cron/tick', '', undefined, { authorization: 'Bearer wrong' })).status).toBe(403);
      const ok = await call('GET', '/cron/tick', undefined, undefined, { authorization: 'Bearer cron-secret-value' });
      expect(ok.status).toBe(200);
      expect(ok.data).toHaveProperty('sent');
    } finally { delete process.env.CRON_SECRET; }
  });

  it('waitlist accepts an email once and rejects junk', async () => {
    expect((await call('POST', '/waitlist', { email: 'Person@Example.test' })).status).toBe(200);
    expect((await call('POST', '/waitlist', { email: 'person@example.test' })).status).toBe(200);
    expect((await one(`select count(*)::int n from waitlist`)).n).toBe(1);
    expect((await call('POST', '/waitlist', { email: 'not-an-email' })).status).toBe(400);
  });
});
