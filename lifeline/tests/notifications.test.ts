import { describe, expect, it } from 'vitest';
import { setProviders, type OutMessage } from '@/server/notify/providers';
import { DAY, HOUR, addLifeline, alerts, armed, call, checkIn, consentToken, events, newUser, one, rows, runTick, settle, state, stepUp, travel, useDb } from './helpers';

useDb();
const S = { intervalSeconds: DAY, graceSeconds: HOUR, reminderOffsets: [], stageWaitSeconds: 1800 };
const MISS = DAY + HOUR + 60;
const relogin = async (u: { email: string; password: string }) => ({ cookie: (await call('POST', '/auth/login', { email: u.email, password: u.password })).cookie! });
const ackToken = (body: string) => body.match(/ack\/(\S+)/)![1];

describe('recipient selection and consent', () => {
  it('alerts only Lifelines who accepted, and records the ones it skipped', async () => {
    const u = await newUser();
    const yes = await addLifeline(u);
    const pending = await addLifeline(u, {}, false);
    await call('PUT', '/protection/settings', S, u.cookie);
    await call('POST', '/protection/arm', {}, u.cookie);
    travel(MISS);
    await settle();
    const a = await alerts(u.userId);
    expect(a.find((x) => x.contact_id === yes.id).status).toBe('accepted');
    const skipped = a.find((x) => x.contact_id === pending.id);
    expect(skipped.status).toBe('suppressed');
    expect(skipped.last_error).toMatch(/consent/i);
  });

  it('a Lifeline who declined or opted out receives nothing, even after accepting earlier', async () => {
    const u = await armed(2, { ...S, escalationMode: 'simultaneous' });
    const r = await call('POST', `/consent/${u.contacts[0].token}`, { decision: 'revoke' });
    expect(r.data.status).toBe('revoked');
    travel(MISS);
    await settle();
    const a = await alerts(u.userId);
    expect(a.find((x) => x.contact_id === u.contacts[0].id).status).toBe('suppressed');
    expect(a.find((x) => x.contact_id === u.contacts[1].id).status).toBe('accepted');
    expect((await events(u.userId, 'lifeline.consent.revoked')).length).toBe(1);
  });

  it('an opt-out that arrives after an alert was queued still stops it', async () => {
    const u = await armed(1, S);
    setProviders({ email: { send: async () => { throw new Error('provider down'); } } });
    travel(MISS);
    await runTick(); // alert queued, first attempt fails → waits for a retry
    await call('POST', `/consent/${u.contacts[0].token}`, { decision: 'revoke' });
    setProviders(null);
    travel(120);
    await settle();
    const [a] = await alerts(u.userId);
    expect(a.status).toBe('cancelled');
    expect(a.last_error).toMatch(/consent withdrawn/i);
  });

  it('changing a Lifeline\'s address resets consent, so alerts cannot be redirected to someone who never agreed', async () => {
    const u = await armed(1, S);
    await stepUp(u);
    const id = u.contacts[0].id;
    const upd = await call('PUT', `/contacts/${id}`, { name: 'Contact', email: 'redirected@example.test', channels: ['email'] }, u.cookie);
    expect(upd.status).toBe(200);
    expect((await one(`select consent_status from contacts where id = $1`, [id])).consent_status).toBe('pending');
    travel(MISS);
    await settle();
    const [a] = await alerts(u.userId);
    expect(a.status).toBe('suppressed');
    expect((await rows(`select 1 from notifications where recipient = 'redirected@example.test' and kind = 'alert' and status = 'accepted'`)).length).toBe(0);
    // The old consent link no longer works; the new address got its own request.
    expect((await call('GET', `/consent/${u.contacts[0].token}`)).status).toBe(404);
    expect((await call('GET', `/consent/${await consentToken(id)}`)).status).toBe(200);
  });

  it('the consent page keeps evidence of the decision', async () => {
    const u = await newUser();
    const c = await addLifeline(u, {}, false);
    await call('POST', `/consent/${c.token}`, { decision: 'grant' }, undefined, { 'x-forwarded-for': '203.0.113.9' });
    const row = await one(`select consent_status, consent_channels, consent_evidence from contacts where id = $1`, [c.id]);
    expect(row.consent_status).toBe('granted');
    expect(row.consent_channels).toEqual(['email']);
    expect(row.consent_evidence).toMatchObject({ ip: '203.0.113.9', decision: 'grant', textVersion: expect.any(String) });
  });
});

describe('escalation order', () => {
  it('simultaneous: everyone at once', async () => {
    const u = await armed(3, { ...S, escalationMode: 'simultaneous' });
    travel(MISS);
    await settle();
    const a = await alerts(u.userId);
    expect(a.length).toBe(3);
    expect(a.every((x) => x.stage === 1 && x.status === 'accepted')).toBe(true);
    expect((await one(`select next_stage_at from incidents where user_id = $1`, [u.userId])).next_stage_at).toBeNull();
  });

  it('sequential: next Lifeline only after the wait, with no acknowledgment', async () => {
    const u = await armed(3, { ...S, escalationMode: 'sequential' });
    travel(MISS);
    await settle();
    expect((await alerts(u.userId)).map((x) => x.contact_id)).toEqual([u.contacts[0].id]);
    travel(1700);
    await settle();
    expect((await alerts(u.userId)).length).toBe(1); // wait not over
    travel(200);
    await settle();
    expect((await alerts(u.userId)).map((x) => x.contact_id)).toEqual([u.contacts[0].id, u.contacts[1].id]);
    travel(1900);
    await settle();
    const a = await alerts(u.userId);
    expect(a.map((x) => x.contact_id)).toEqual(u.contacts.map((c) => c.id));
    expect(a.map((x) => x.stage)).toEqual([1, 2, 3]);
    travel(DAY);
    await settle();
    expect((await alerts(u.userId)).length).toBe(3); // no repeats after the last stage
  });

  it('custom: two together first, then the third', async () => {
    const u = await newUser();
    await call('POST', '/billing/checkout', { plan: 'premium' }, u.cookie);
    await call('PUT', '/protection/settings', { ...S, escalationMode: 'custom' }, u.cookie);
    const a1 = await addLifeline(u, { stage: 1, priority: 1 });
    const a2 = await addLifeline(u, { stage: 1, priority: 2 });
    const b = await addLifeline(u, { stage: 2 });
    await call('POST', '/protection/arm', {}, u.cookie);
    travel(MISS);
    await settle();
    expect((await alerts(u.userId)).map((x) => x.contact_id).sort()).toEqual([a1.id, a2.id].sort());
    travel(1900);
    await settle();
    expect((await alerts(u.userId)).map((x) => x.contact_id)).toContain(b.id);
  });

  it('skips a stage that can reach nobody instead of waiting', async () => {
    const u = await armed(2, { ...S, escalationMode: 'sequential' });
    await call('POST', `/consent/${u.contacts[0].token}`, { decision: 'decline' });
    travel(MISS);
    await settle();
    const a = await alerts(u.userId);
    expect(a.find((x) => x.contact_id === u.contacts[1].id).status).toBe('accepted');
  });

  it('tells the member when nobody could be notified', async () => {
    const u = await newUser();
    await addLifeline(u, {}, false);
    await call('PUT', '/protection/settings', S, u.cookie);
    await call('POST', '/protection/arm', {}, u.cookie);
    travel(MISS);
    await settle();
    expect((await rows(`select 1 from notifications where user_id = $1 and kind = 'no_recipients'`, [u.userId])).length).toBe(1);
  });
});

describe('acknowledgment', () => {
  it('stops later stages but does not resolve the incident or claim the member is safe', async () => {
    const u = await armed(2, { ...S, escalationMode: 'sequential' });
    travel(MISS);
    await settle();
    const [a] = await alerts(u.userId);
    const token = ackToken(a.body);
    expect((await call('GET', `/ack/${token}`)).data.acknowledged).toBe(false);
    const r = await call('POST', `/ack/${token}`, {});
    expect(r.status).toBe(200);
    expect(r.data.resolved).toBe(false);
    expect((await call('POST', `/ack/${token}`, {})).status).toBe(200); // repeat is harmless
    expect((await events(u.userId, 'incident.acknowledged')).length).toBe(1);
    travel(DAY);
    await settle();
    expect((await alerts(u.userId)).length).toBe(1);
    expect((await one(`select status from incidents where user_id = $1`, [u.userId])).status).toBe('open');
    expect((await one(`select status from protection where user_id = $1`, [u.userId])).status).toBe('escalating');
    expect((await call('POST', '/ack/not-a-real-token', {})).status).toBe(404);
  });
});

describe('provider failures and retries', () => {
  it('retries with a delay and succeeds; "accepted" is not reported as delivered', async () => {
    const u = await armed(1, S);
    let calls = 0;
    const seen: OutMessage[] = [];
    setProviders({ email: { send: async (m) => { if (!m.subject.includes('missed')) return { provider: 'test', ref: 'other', simulated: true }; seen.push(m); if (++calls <= 2) throw new Error('503 from provider'); return { provider: 'test', ref: 'ok-1', simulated: true }; } } });
    travel(MISS);
    await runTick();
    let [a] = await alerts(u.userId);
    expect(a.status).toBe('queued');
    expect(a.last_error).toMatch(/503/);
    await runTick();
    expect(calls).toBe(1); // backoff: not retried immediately in a tight loop
    travel(40); await runTick();
    travel(130); await runTick();
    [a] = await alerts(u.userId);
    expect(a.status).toBe('accepted');
    expect(a.status).not.toBe('delivered');
    expect(seen.length).toBe(3);
    expect(new Set(seen.map((m) => m.idempotencyKey)).size).toBe(1); // same idempotency key on every retry
  });

  it('gives up after the retry cap, marks the message failed and records an audit event', async () => {
    const u = await armed(1, S);
    setProviders({ email: { send: async () => { throw new Error('permanent failure'); } } });
    travel(MISS);
    for (let i = 0; i < 8; i++) { await runTick(); travel(40 * 60); }
    const [a] = await alerts(u.userId);
    expect(a.status).toBe('failed');
    expect(a.attempts).toBe(4);
    const ev = await events(u.userId, 'notification.failed');
    expect(ev.some((e) => JSON.parse(e.detail).kind === 'alert')).toBe(true);
  });

  it('a failure for one Lifeline does not block another', async () => {
    const u = await armed(2, { ...S, escalationMode: 'simultaneous' });
    const bad = (await one(`select email from contacts where id = $1`, [u.contacts[0].id])).email;
    setProviders({ email: { send: async (m) => { if (m.to === bad) throw new Error('bounce'); return { provider: 'test', ref: 'x', simulated: true }; } } });
    travel(MISS);
    await settle();
    const a = await alerts(u.userId);
    expect(a.find((x) => x.contact_id === u.contacts[1].id).status).toBe('accepted');
    expect(a.find((x) => x.contact_id === u.contacts[0].id).status).toBe('queued');
  });
});

describe('resolution', () => {
  it('a check-in stops unsent alerts and tells already-alerted Lifelines, without claiming a recall', async () => {
    let u = await armed(2, { ...S, escalationMode: 'sequential' });
    travel(MISS);
    await settle();
    u = { ...u, ...(await relogin(u)) };
    const r = await checkIn(u);
    expect(r.data.resolvedIncident).toBe(true);
    await settle();
    travel(DAY / 2);
    await settle();
    const a = await alerts(u.userId);
    expect(a.length).toBe(1); // the second Lifeline was never contacted
    const clear = await rows(`select body, contact_id from notifications where user_id = $1 and kind = 'all_clear'`, [u.userId]);
    expect(clear.length).toBe(1);
    expect(clear[0].contact_id).toBe(u.contacts[0].id);
    expect(clear[0].body).toMatch(/cannot confirm their wellbeing/);
    expect(clear[0].body).not.toMatch(/recall|disregard|ignore the previous/i);
    expect((await one(`select status, resolution from incidents where user_id = $1`, [u.userId]))).toMatchObject({ status: 'resolved', resolution: 'checked_in' });
    // The ack link still works after resolution and says so.
    expect((await call('POST', `/ack/${ackToken(a[0].body)}`, {})).data.resolved).toBe(true);
  });

  it('a second missed cycle opens a new, separate incident', async () => {
    let u = await armed(1, S);
    travel(MISS); await settle();
    u = { ...u, ...(await relogin(u)) };
    await checkIn(u);
    travel(MISS); await settle();
    expect((await rows(`select 1 from incidents where user_id = $1`, [u.userId])).length).toBe(2);
    expect((await alerts(u.userId)).length).toBe(2);
  });
});

describe('demonstration safety', () => {
  it('never uses a live provider in demo mode, even with credentials and live flags set', async () => {
    Object.assign(process.env, { RESEND_API_KEY: 're_test', LIFELINE_LIVE_EMAIL: '1', LIFELINE_LIVE_SMS: '1', TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 't', TWILIO_FROM: '+15005550006' });
    const realFetch = globalThis.fetch;
    let external = 0;
    globalThis.fetch = (async () => { external++; throw new Error('network must not be used'); }) as any;
    try {
      const u = await armed(1, S);
      travel(MISS);
      await settle();
      const sent = await rows(`select simulated, provider, status from notifications where user_id = $1 and status = 'accepted'`, [u.userId]);
      expect(sent.length).toBeGreaterThan(2);
      expect(sent.every((n) => n.simulated === true && n.provider === 'simulated')).toBe(true);
      expect(external).toBe(0);
    } finally {
      globalThis.fetch = realFetch;
      for (const k of ['RESEND_API_KEY', 'LIFELINE_LIVE_EMAIL', 'LIFELINE_LIVE_SMS', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM']) delete process.env[k];
    }
  });

  it('hides Lifeline message bodies from the member outside demo mode', async () => {
    const u = await armed(1, S);
    travel(MISS); await settle();
    const v = await relogin(u);
    process.env.LIFELINE_DEMO_MODE = '0';
    process.env.LIFELINE_SECRET = 'x'.repeat(40);
    try {
      const h = await call('GET', '/history', undefined, v.cookie);
      const alert = h.data.notifications.find((n: any) => n.kind === 'alert');
      expect(alert.body).toBeNull();
      expect((await call('POST', '/demo/jump', { jump: 'deadline' }, v.cookie)).status).toBe(403);
      expect((await call('POST', '/demo/tamper', {}, v.cookie)).status).toBe(403);
    } finally {
      process.env.LIFELINE_DEMO_MODE = '1';
      delete process.env.LIFELINE_SECRET;
    }
  });

  it('time-travel controls walk a demo account through reminder, deadline, grace and stages', async () => {
    const u = await armed(2, { intervalSeconds: 10 * DAY, graceSeconds: 6 * HOUR, reminderOffsets: [2 * DAY, DAY], escalationMode: 'sequential', stageWaitSeconds: 1800 });
    expect((await call('POST', '/demo/jump', { jump: 'reminder' }, u.cookie)).status).toBe(200);
    expect((await rows(`select 1 from notifications where user_id = $1 and kind = 'reminder'`, [u.userId])).length).toBe(1);
    await call('POST', '/demo/jump', { jump: 'deadline' }, u.cookie);
    expect((await state(u)).protection.status).toBe('grace');
    await call('POST', '/demo/jump', { jump: 'grace' }, u.cookie);
    expect((await state(u)).protection.status).toBe('escalating');
    expect((await alerts(u.userId)).length).toBe(1);
    await call('POST', '/demo/jump', { jump: 'stage' }, u.cookie);
    expect((await alerts(u.userId)).length).toBe(2);
    expect((await events(u.userId, 'demo.time_travel')).length).toBe(4);
  });
});
