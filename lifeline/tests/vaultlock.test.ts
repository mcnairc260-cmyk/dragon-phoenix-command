import { describe, expect, it } from 'vitest';
import { verifyChain } from '@/server/audit';
import { verifySealed } from '@/server/vaultlock';
import { DAY, HOUR, addLifeline, alerts, armed, call, checkIn, db, enrollPasskey, events, makeAuthenticator, newUser, one, rows, sealVault, settle, state, stepUp, travel, useDb } from './helpers';

useDb();
const S = { intervalSeconds: DAY, graceSeconds: HOUR, reminderOffsets: [], stageWaitSeconds: 1800 };
const MISS = DAY + HOUR + 60;
const login = async (u: { email: string; password: string }) => (await call('POST', '/auth/login', { email: u.email, password: u.password })).cookie!;
const sealed = async (n = 1, s: Record<string, unknown> = S) => {
  const u = await armed(n, s);
  return { ...u, recoveryKey: await sealVault(u) };
};

describe('sealing', () => {
  it('needs fresh identity confirmation, an explicit acknowledgment and a consenting Lifeline', async () => {
    const u = await armed(1, S);
    expect((await call('POST', '/vaultlock/seal', { acknowledged: true }, u.cookie)).data.error.code).toBe('STEP_UP_REQUIRED');
    await stepUp(u);
    expect((await call('POST', '/vaultlock/seal', {}, u.cookie)).status).toBe(400);

    const v = await newUser();
    await addLifeline(v, {}, false); // nobody has accepted
    await call('POST', '/protection/arm', {}, v.cookie);
    await stepUp(v);
    expect((await call('POST', '/vaultlock/seal', { acknowledged: true }, v.cookie)).status).toBe(409);

    const r = await call('POST', '/vaultlock/seal', { acknowledged: true }, u.cookie);
    expect(r.status).toBe(200);
    expect(r.data.recoveryKey).toMatch(/^[0-9A-F-]{40,}$/);
    const st = await state(u);
    expect(st.vaultlock).toMatchObject({ active: true, version: 1, integrity: 'ok' });
    // The recovery key itself is not stored anywhere; only a hash.
    const dump = JSON.stringify(await rows(`select * from sealed_policies where user_id = $1`, [u.userId]));
    expect(dump).not.toContain(r.data.recoveryKey);
    expect((await call('POST', '/vaultlock/seal', { acknowledged: true }, u.cookie)).status).toBe(409);
  });
});

describe('sealed settings cannot be changed from a normal, fully authenticated session', () => {
  it('blocks every protected operation at the API and records each attempt', async () => {
    const u = await sealed(2);
    await stepUp(u); // even with password + passphrase just confirmed
    const id = u.contacts[0].id;
    const attempts: [string, string, unknown][] = [
      ['POST', '/contacts', { name: 'New', email: 'new@example.test', channels: ['email'] }],
      ['PUT', `/contacts/${id}`, { name: 'Changed', email: 'changed@example.test', channels: ['email'] }],
      ['PUT', `/contacts/${id}`, { name: 'Contact', email: (await one(`select email from contacts where id = $1`, [id])).email, channels: ['email'], priority: 9, message: 'different text' }],
      ['DELETE', `/contacts/${id}`, undefined],
      ['PUT', '/protection/settings', { intervalSeconds: 30 * DAY }],
      ['PUT', '/protection/settings', { graceSeconds: 7 * DAY }],
      ['PUT', '/protection/settings', { reminderOffsets: [HOUR] }],
      ['PUT', '/protection/settings', { escalationMode: 'sequential' }],
      ['PUT', '/protection/settings', { stageWaitSeconds: 6 * DAY }],
      ['POST', '/protection/pause', {}],
      ['POST', '/auth/passphrase', { passphrase: 'a brand new passphrase' }],
    ];
    const before = JSON.stringify(await rows(`select * from contacts where user_id = $1 order by id`, [u.userId])) + JSON.stringify(await one(`select interval_seconds, grace_seconds, reminder_offsets, escalation_mode, stage_wait_seconds, status from protection where user_id = $1`, [u.userId]));
    for (const [m, p, b] of attempts) {
      const r = await call(m, p, b, u.cookie);
      expect([m, p, r.status, r.data.error?.code]).toEqual([m, p, 423, 'VAULTLOCKED']);
    }
    const after = JSON.stringify(await rows(`select * from contacts where user_id = $1 order by id`, [u.userId])) + JSON.stringify(await one(`select interval_seconds, grace_seconds, reminder_offsets, escalation_mode, stage_wait_seconds, status from protection where user_id = $1`, [u.userId]));
    expect(after).toBe(before);
    expect((await events(u.userId, 'vaultlock.blocked_attempt')).length).toBe(attempts.length);
    expect((await one(`select checkin_secret_hash is not null ok from users where id = $1`, [u.userId])).ok).toBe(true);
    expect((await checkIn(u)).status).toBe(200); // the old passphrase still works: it was not replaced
  });

  it('blocks enrolling or removing an authentication device', async () => {
    const u = await newUser();
    const authn = await enrollPasskey(u);
    await addLifeline(u);
    await call('POST', '/protection/arm', {}, u.cookie);
    const step = async () => {
      const o = await call('POST', '/auth/stepup/options', {}, u.cookie);
      return stepUp(u, { assertion: authn.assert(o.data.options) });
    };
    expect((await step()).status).toBe(200);
    expect((await call('POST', '/vaultlock/seal', { acknowledged: true }, u.cookie)).status).toBe(200);
    const attacker = makeAuthenticator();
    const { data } = await call('POST', '/passkeys/options', {}, u.cookie);
    const r = await call('POST', '/passkeys', { response: attacker.register(data.options), label: 'Attacker phone' }, u.cookie);
    expect(r.status).toBe(423);
    const keys = await rows(`select id from webauthn_credentials where user_id = $1`, [u.userId]);
    expect(keys.length).toBe(1);
    expect((await call('DELETE', `/passkeys/${keys[0].id}`, undefined, u.cookie)).status).toBe(423);
    expect((await events(u.userId, 'vaultlock.blocked_attempt')).map((e) => JSON.parse(e.detail).action)).toEqual(['passkey.enroll', 'passkey.remove']);
  });

  it('still allows a normal verified check-in', async () => {
    const u = await sealed();
    travel(600);
    const r = await checkIn(u);
    expect(r.status).toBe(200);
    expect((await state(u)).protection.status).toBe('active');
  });

  it('a stolen session (no password, no passphrase) can change nothing and cannot check in', async () => {
    const u = await sealed();
    const stolen = u.cookie;
    travel(11 * 60); // the owner's earlier identity confirmation has timed out
    for (const [m, p, b] of [['POST', '/protection/pause', {}], ['PUT', '/protection/settings', { intervalSeconds: 30 * DAY }], ['DELETE', `/contacts/${u.contacts[0].id}`, undefined]] as const) {
      expect((await call(m, p, b, stolen)).status).toBe(423);
    }
    expect((await call('POST', '/checkin', { passphrase: '' }, stolen)).status).toBe(401);
    expect((await call('POST', '/auth/stepup', { password: 'guess', passphrase: 'guess' }, stolen)).status).toBe(401);
  });

  it('an email password reset does not release VaultLock', async () => {
    const u = await sealed();
    await call('POST', '/auth/password/forgot', { email: u.email });
    const { body } = await one(`select body from notifications where user_id = $1 and kind = 'password_reset'`, [u.userId]);
    await call('POST', '/auth/password/reset', { token: body.match(/reset\/(\S+)/)[1], password: 'attacker chosen password' });
    const cookie = await login({ email: u.email, password: 'attacker chosen password' });
    expect((await call('GET', '/me', undefined, cookie)).data.vaultlock.active).toBe(true);
    // The attacker now has the email and the new password — but not the passphrase.
    expect((await call('POST', '/auth/stepup', { password: 'attacker chosen password', passphrase: 'guess' }, cookie)).status).toBe(401);
    expect((await call('DELETE', `/contacts/${u.contacts[0].id}`, undefined, cookie)).status).toBe(423);
    expect((await call('POST', '/protection/pause', {}, cookie)).status).toBe(423);
    // The recovery path needs the recovery key, which email access does not give.
    expect((await call('POST', '/vaultlock/recovery/start', { email: u.email, password: 'attacker chosen password', recoveryKey: 'AAAAA-BBBBB' })).status).toBe(401);
  });
});

describe('database guards (second line of defence)', () => {
  it('rejects direct SQL writes to sealed data', async () => {
    const u = await sealed(2);
    const fails = async (sql: string, params: unknown[] = [u.userId]) => expect(db.query(sql, params)).rejects.toThrow(/LL_VAULTLOCK|LL_IMMUTABLE/);
    await fails(`update contacts set email = 'evil@example.test' where user_id = $1`);
    await fails(`update contacts set phone = '+15550000000' where user_id = $1`);
    await fails(`update contacts set removed_at = now() where user_id = $1`);
    await fails(`insert into contacts (id, user_id, name, email, created_at) values ('00000000-0000-4000-8000-000000000001', $1, 'x', 'x@example.test', now())`);
    await fails(`delete from contacts where user_id = $1`);
    await fails(`update protection set interval_seconds = 999999 where user_id = $1`);
    await fails(`update protection set status = 'paused' where user_id = $1`);
    await fails(`update protection set status = 'setup' where user_id = $1`);
    await fails(`update protection set vaultlock_active = false where user_id = $1`);
    await fails(`update protection set sealed_policy_id = null where user_id = $1`);
    await fails(`delete from protection where user_id = $1`);
    await fails(`update users set checkin_secret_hash = 'x' where id = $1`);
    await fails(`update sealed_policies set policy = '{}' where user_id = $1`);
    await fails(`update sealed_policies set status = 'released' where user_id = $1`);
    await fails(`delete from sealed_policies where user_id = $1`);
    // A consent-context transaction may change consent fields only.
    await expect(db.tx((q) => q.query(`update contacts set email = 'evil@example.test' where user_id = $1`, [u.userId]), 'consent')).rejects.toThrow(/LL_VAULTLOCK/);
  });

  it('protects audit and delivery history from change and deletion (sealed or not)', async () => {
    const u = await armed(1, S);
    travel(MISS); await settle();
    for (const sql of [
      `update audit_events set detail = '{}' where user_id = $1`, `delete from audit_events where user_id = $1`,
      `delete from notifications where user_id = $1`, `delete from incidents where user_id = $1`,
    ]) await expect(db.query(sql, [u.userId])).rejects.toThrow(/LL_IMMUTABLE/);
    await expect(db.query(`truncate audit_events`)).rejects.toThrow(/LL_IMMUTABLE/);
  });
});

describe('integrity', () => {
  it('the audit chain verifies, and any edited or removed record is detected', async () => {
    const u = await sealed();
    expect(await verifyChain(db, u.userId)).toMatchObject({ ok: true });
    const view = await call('GET', '/audit', undefined, u.cookie);
    expect(view.data.chain.ok).toBe(true);
    expect(view.data.events.map((e: any) => e.type)).toContain('vaultlock.sealed');
    // Simulate an attacker who is the database owner and can switch the guard off.
    await db.query(`alter table audit_events disable trigger ll_audit_rows`);
    try {
      const [ev] = await rows(`select seq, detail from audit_events where user_id = $1 and type = 'vaultlock.sealed'`, [u.userId]);
      await db.query(`update audit_events set detail = '{"forged":true}' where seq = $1`, [ev.seq]);
      expect(await verifyChain(db, u.userId)).toMatchObject({ ok: false, brokenAtSeq: Number(ev.seq) });
      await db.query(`update audit_events set detail = $2 where seq = $1`, [ev.seq, ev.detail]);
      expect((await verifyChain(db, u.userId)).ok).toBe(true);
      await db.query(`delete from audit_events where seq = (select max(seq) from audit_events where user_id = $1)`, [u.userId]);
      expect((await verifyChain(db, u.userId)).ok).toBe(false);
    } finally {
      await db.query(`alter table audit_events enable trigger ll_audit_rows`);
    }
  });

  it('tampered Lifeline data is detected, and alerts still go to the SEALED recipients', async () => {
    const u = await sealed(1);
    const original = (await one(`select email from contacts where id = $1`, [u.contacts[0].id])).email;
    expect((await call('POST', '/demo/tamper', {}, u.cookie)).status).toBe(200); // direct-database rewrite of the email
    expect((await one(`select email from contacts where id = $1`, [u.contacts[0].id])).email).toBe('attacker@example.invalid');
    const st = await state(u);
    expect(st.vaultlock.integrity).toBe('tamper_detected');
    expect(st.vaultlock.differences).toContain('recipients');
    travel(MISS); await settle();
    const a = await alerts(u.userId);
    expect(a.map((x) => x.recipient)).toEqual([original]);
    expect((await one(`select integrity from incidents where user_id = $1`, [u.userId])).integrity).toBe('tamper_detected');
    expect((await events(u.userId, 'vaultlock.tamper_detected')).length).toBe(1);
  });

  it('a forged sealed-policy record fails verification', async () => {
    const u = await sealed(1);
    await db.query(`alter table sealed_policies disable trigger ll_guard_policies`);
    try {
      const { policy } = await one(`select policy from sealed_policies where user_id = $1`, [u.userId]);
      const forged = policy.replace(/contact\d+@example\.test/, 'attacker@example.invalid');
      await db.query(`update sealed_policies set policy = $2 where user_id = $1`, [u.userId, forged]);
      expect((await verifySealed(db, u.userId))!.integrity).toBe('policy_invalid');
      // Recomputing the plain hash is not enough: the HMAC needs the server key.
      const { createHash } = await import('node:crypto');
      await db.query(`update sealed_policies set policy_hash = $2 where user_id = $1`, [u.userId, createHash('sha256').update(forged).digest('hex')]);
      expect((await verifySealed(db, u.userId))!.integrity).toBe('policy_invalid');
    } finally {
      await db.query(`alter table sealed_policies enable trigger ll_guard_policies`);
    }
  });

  it('sealing and a simultaneous Lifeline edit cannot leave a mismatched seal', async () => {
    for (let i = 0; i < 5; i++) {
      const u = await armed(1, S);
      await stepUp(u);
      const id = u.contacts[0].id;
      const email = (await one(`select email from contacts where id = $1`, [id])).email;
      const [seal, edit] = await Promise.all([
        call('POST', '/vaultlock/seal', { acknowledged: true }, u.cookie),
        call('PUT', `/contacts/${id}`, { name: 'Raced edit', email, channels: ['email'], message: 'changed in a race' }, u.cookie),
      ]);
      expect(seal.status).toBe(200);
      expect([200, 423]).toContain(edit.status);
      expect((await verifySealed(db, u.userId))!.integrity).toBe('ok'); // whatever order won, the seal matches the live data
    }
  });
});

describe('Lifeline opt-out under VaultLock', () => {
  it('always works, and can change nothing except consent', async () => {
    const u = await sealed(2, { ...S, escalationMode: 'simultaneous' });
    const before = await one(`select name, email, phone, channels, stage, priority, message from contacts where id = $1`, [u.contacts[0].id]);
    const r = await call('POST', `/consent/${u.contacts[0].token}`, { decision: 'revoke', email: 'redirect@example.test', name: 'x', channels: ['sms'] });
    expect(r.status).toBe(200);
    expect(await one(`select name, email, phone, channels, stage, priority, message from contacts where id = $1`, [u.contacts[0].id])).toEqual(before);
    expect((await verifySealed(db, u.userId))!.integrity).toBe('ok');
    travel(MISS); await settle();
    const a = await alerts(u.userId);
    expect(a.find((x) => x.contact_id === u.contacts[0].id).status).toBe('suppressed');
    expect(a.find((x) => x.contact_id === u.contacts[1].id).status).toBe('accepted');
  });
});

describe('exceptional recovery', () => {
  it('needs the password AND the recovery key', async () => {
    const u = await sealed();
    expect((await call('POST', '/vaultlock/recovery/start', { email: u.email, password: u.password, recoveryKey: 'WRONG-WRONG-WRONG' })).status).toBe(401);
    expect((await call('POST', '/vaultlock/recovery/start', { email: u.email, password: 'wrong password', recoveryKey: u.recoveryKey })).status).toBe(401);
    expect((await events(u.userId, 'vaultlock.recovery.auth_failed')).length).toBe(2);
    const plain = await armed(1, S); // VaultLock not active → same refusal
    expect((await call('POST', '/vaultlock/recovery/start', { email: plain.email, password: plain.password, recoveryKey: u.recoveryKey })).status).toBe(401);
  });

  it('is delayed: nothing changes during the wait, protection keeps running, and Lifelines are told', async () => {
    const u = await sealed(1);
    const creds = { email: u.email, password: u.password, recoveryKey: u.recoveryKey.toLowerCase().replace(/-/g, ' ') };
    const start = await call('POST', '/vaultlock/recovery/start', creds);
    expect(start.status).toBe(200);
    expect(new Date(start.data.effectiveAt).getTime()).toBeGreaterThan(Date.now() + 71 * HOUR * 1000);
    expect((await call('POST', '/vaultlock/recovery/complete', creds)).status).toBe(409); // too early
    expect((await one(`select vaultlock_active from protection where user_id = $1`, [u.userId])).vaultlock_active).toBe(true);
    const notices = await rows(`select recipient, body from notifications where user_id = $1 and kind = 'recovery_notice'`, [u.userId]);
    expect(notices.length).toBe(2); // the member and the consenting Lifeline
    const cookie = await login(u);
    expect((await call('DELETE', `/contacts/${u.contacts[0].id}`, undefined, cookie)).status).toBe(423); // still sealed

    travel(MISS); await settle(); // a check-in is missed during the waiting period
    expect((await alerts(u.userId)).filter((a) => a.status === 'accepted').length).toBe(1);

    travel(72 * HOUR);
    const done = await call('POST', '/vaultlock/recovery/complete', creds);
    expect(done.data.released).toBe(true);
    const st = (await call('GET', '/me', undefined, done.cookie)).data;
    expect(st.vaultlock.active).toBe(false);
    expect(st.protection.status).toBe('escalating'); // release does not suppress the open incident
    expect((await one(`select status from sealed_policies where user_id = $1`, [u.userId])).status).toBe('released');
    expect((await call('GET', '/me', undefined, cookie)).status).toBe(401); // other sessions were ended
    expect((await call('DELETE', `/contacts/${u.contacts[0].id}`, undefined, done.cookie)).status).toBe(200); // unsafe setup can now be fixed
    expect((await events(u.userId, 'vaultlock.released')).length).toBe(1);
    expect((await call('POST', '/vaultlock/recovery/complete', creds)).status).toBe(401); // key is single-use: nothing sealed now
  });

  it('can be cancelled from a signed-in session or from the emailed link', async () => {
    const u = await sealed();
    const creds = { email: u.email, password: u.password, recoveryKey: u.recoveryKey };
    await call('POST', '/vaultlock/recovery/start', creds);
    expect((await state(u)).recovery).not.toBeNull();
    expect((await call('POST', '/vaultlock/recovery/cancel', {}, u.cookie)).data.cancelled).toBe(true);
    travel(80 * HOUR);
    expect((await call('POST', '/vaultlock/recovery/complete', creds)).status).toBe(409);

    await call('POST', '/vaultlock/recovery/start', creds);
    const mails = await rows(`select body from notifications where user_id = $1 and kind = 'recovery_notice' and recipient = $2 order by created_at desc, id desc`, [u.userId, u.email]);
    const token = mails.map((m) => m.body.match(/recover\/cancel\/(\S+)/)?.[1]).filter(Boolean);
    const results = [];
    for (const t of token) results.push((await call('POST', '/vaultlock/recovery/cancel-token', { token: t })).data.cancelled);
    expect(results).toContain(true);
    expect((await one(`select count(*)::int n from recovery_requests where user_id = $1 and status = 'pending'`, [u.userId])).n).toBe(0);
    expect((await events(u.userId, 'vaultlock.recovery.cancelled')).length).toBe(2);
  });

  it('expires if not completed, and a second start does not shorten the wait', async () => {
    const u = await sealed();
    const creds = { email: u.email, password: u.password, recoveryKey: u.recoveryKey };
    const first = await call('POST', '/vaultlock/recovery/start', creds);
    travel(HOUR);
    const second = await call('POST', '/vaultlock/recovery/start', creds);
    expect(second.data.alreadyPending).toBe(true);
    expect(second.data.effectiveAt).toBe(first.data.effectiveAt);
    travel(11 * DAY);
    expect((await call('POST', '/vaultlock/recovery/complete', creds)).data).toMatchObject({ released: false, expired: true });
    expect((await one(`select vaultlock_active from protection where user_id = $1`, [u.userId])).vaultlock_active).toBe(true);
  });

  it('after release a new seal gets a new version and a new recovery key', async () => {
    const u = await sealed();
    const creds = { email: u.email, password: u.password, recoveryKey: u.recoveryKey };
    await call('POST', '/vaultlock/recovery/start', creds);
    travel(73 * HOUR);
    const done = await call('POST', '/vaultlock/recovery/complete', creds);
    const v = { ...u, cookie: done.cookie! };
    await checkIn(v);
    const again = await call('POST', '/vaultlock/seal', { acknowledged: true }, v.cookie);
    expect(again.status).toBe(200);
    expect(again.data.version).toBe(2);
    expect(again.data.recoveryKey).not.toBe(u.recoveryKey);
    expect((await call('POST', '/vaultlock/recovery/start', creds)).status).toBe(401); // the old key is dead
  });
});
