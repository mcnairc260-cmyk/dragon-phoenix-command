import { describe, expect, it } from 'vitest';
import { addLifeline, armed, call, checkIn, enrollPasskey, events, makeAuthenticator, newUser, one, rows, state, stepUp, travel, testDb } from './helpers';

testDb();

describe('sign-in', () => {
  it('rejects a wrong password and an unknown email with the same answer', async () => {
    const u = await newUser();
    const wrong = await call('POST', '/auth/login', { email: u.email, password: 'not the password' });
    const unknown = await call('POST', '/auth/login', { email: 'nobody@example.test', password: 'not the password' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.data.error.message).toBe(unknown.data.error.message);
    expect((await events(u.userId, 'auth.login.failed')).length).toBe(1);
  });

  it('rate-limits repeated sign-in attempts for one email', async () => {
    const u = await newUser();
    const codes = [];
    for (let i = 0; i < 10; i++) codes.push((await call('POST', '/auth/login', { email: u.email, password: 'guess number ' + i })).status);
    expect(codes.slice(0, 8).every((c) => c === 401)).toBe(true);
    expect(codes[9]).toBe(429);
    // Even the correct password is refused while the limit is active.
    expect((await call('POST', '/auth/login', { email: u.email, password: u.password })).status).toBe(429);
  });

  it('refuses access without a session', async () => {
    for (const [m, p] of [['GET', '/me'], ['GET', '/contacts'], ['POST', '/checkin'], ['GET', '/audit'], ['POST', '/vaultlock/seal']]) {
      expect((await call(m, p, m === 'GET' ? undefined : {})).status).toBe(401);
    }
    expect((await call('GET', '/me', undefined, 'll_session=forged-token')).status).toBe(401);
  });

  it('expires an idle session and enforces an absolute lifetime', async () => {
    const u = await newUser();
    expect((await call('GET', '/me', undefined, u.cookie)).status).toBe(200);
    travel(31 * 60);
    expect((await call('GET', '/me', undefined, u.cookie)).status).toBe(401);

    const v = await newUser();
    for (let i = 0; i < 30; i++) { // stays active every 25 minutes, so the idle timer never fires
      travel(25 * 60);
      const r = await call('GET', '/me', undefined, v.cookie);
      if (i < 28) expect(r.status).toBe(200);
    }
    expect((await call('GET', '/me', undefined, v.cookie)).status).toBe(401); // 12.5 h: past the absolute limit
  });

  it('ends the session on sign-out', async () => {
    const u = await newUser();
    await call('POST', '/auth/logout', {}, u.cookie);
    expect((await call('GET', '/me', undefined, u.cookie)).status).toBe(401);
  });

  it('refuses a state-changing request from another origin', async () => {
    const u = await newUser();
    const r = await call('POST', '/protection/arm', {}, u.cookie, { origin: 'https://evil.example' });
    expect(r.status).toBe(403);
  });

  it('requires a verified email, a passphrase and a Lifeline before protection can start', async () => {
    const u = await newUser({ verify: false, passphrase: false });
    expect((await call('POST', '/protection/arm', {}, u.cookie)).data.error.message).toMatch(/email/i);
  });

  it('makes email-verification links single-use', async () => {
    const u = await newUser({ verify: false });
    const { body } = await one(`select body from notifications where user_id = $1 and kind = 'verify_email'`, [u.userId]);
    const token = body.match(/verify-email\/(\S+)/)[1];
    expect((await call('POST', '/auth/verify-email', { token })).status).toBe(200);
    expect((await call('POST', '/auth/verify-email', { token })).status).toBe(400);
  });
});

describe('check-in passphrase', () => {
  it('must differ from the sign-in password', async () => {
    const u = await newUser({ passphrase: false });
    const r = await call('POST', '/auth/passphrase', { passphrase: u.password }, u.cookie);
    expect(r.status).toBe(400);
  });

  it('rejects a wrong passphrase, records it, and does not move the deadline', async () => {
    const u = await armed();
    const before = (await state(u)).protection.deadlineAt;
    travel(600);
    const r = await checkIn(u, { passphrase: 'wrong passphrase' });
    expect(r.status).toBe(401);
    expect((await state(u)).protection.deadlineAt).toBe(before);
    expect((await events(u.userId, 'auth.presence.failed')).length).toBe(1);
  });

  it('rate-limits passphrase guessing', async () => {
    const u = await armed();
    const codes = [];
    for (let i = 0; i < 8; i++) codes.push((await checkIn(u, { passphrase: 'guess ' + i })).status);
    expect(codes.filter((c) => c === 401).length).toBe(6);
    expect(codes[7]).toBe(429);
  });

  it('a password alone (without the passphrase) cannot check in', async () => {
    const u = await armed();
    expect((await checkIn(u, { passphrase: u.password })).status).toBe(401);
  });
});

describe('password reset by email', () => {
  it('changes only the sign-in password, ends old sessions, and is single-use', async () => {
    const u = await armed();
    await call('POST', '/auth/password/forgot', { email: u.email });
    const { body } = await one(`select body from notifications where user_id = $1 and kind = 'password_reset'`, [u.userId]);
    const token = body.match(/reset\/(\S+)/)[1];
    const before = await one(`select checkin_secret_hash from users where id = $1`, [u.userId]);
    expect((await call('POST', '/auth/password/reset', { token, password: 'a brand new password' })).status).toBe(200);
    expect((await call('GET', '/me', undefined, u.cookie)).status).toBe(401); // old session revoked
    expect((await call('POST', '/auth/password/reset', { token, password: 'another new password' })).status).toBe(400);
    const after = await one(`select checkin_secret_hash from users where id = $1`, [u.userId]);
    expect(after.checkin_secret_hash).toBe(before.checkin_secret_hash);
    const login = await call('POST', '/auth/login', { email: u.email, password: 'a brand new password' });
    expect(login.status).toBe(200);
    // The new password still cannot check in without the unchanged passphrase.
    expect((await call('POST', '/checkin', { passphrase: 'a brand new password' }, login.cookie)).status).toBe(401);
  });

  it('gives the same answer for an unknown email', async () => {
    expect((await call('POST', '/auth/password/forgot', { email: 'ghost@example.test' })).status).toBe(200);
  });
});

describe('passkeys (WebAuthn)', () => {
  it('enrolls a passkey, then requires it at sign-in and at check-in', async () => {
    const u = await newUser();
    const authn = await enrollPasskey(u);
    await addLifeline(u);
    await call('POST', '/protection/arm', {}, u.cookie);

    const login = await call('POST', '/auth/login', { email: u.email, password: u.password });
    expect(login.data.mfaRequired).toBe(true);
    expect((await call('GET', '/me', undefined, login.cookie)).status).toBe(401); // password alone is not a session
    const { data } = await call('POST', '/auth/login/passkey/options', {}, login.cookie);
    expect((await call('POST', '/auth/login/passkey/verify', { assertion: authn.assert(data.options) }, login.cookie)).status).toBe(200);
    expect((await call('GET', '/me', undefined, login.cookie)).status).toBe(200);

    expect((await checkIn(u)).status).toBe(401); // passphrase without the device
    const opt = await call('POST', '/checkin/options', {}, u.cookie);
    const ok = await checkIn(u, { assertion: authn.assert(opt.data.options) });
    expect(ok.status).toBe(200);
    expect(ok.data.device).toBe('passkey');
  });

  it('rejects a replayed assertion', async () => {
    const u = await newUser();
    const authn = await enrollPasskey(u);
    await addLifeline(u);
    await call('POST', '/protection/arm', {}, u.cookie);
    const opt = await call('POST', '/checkin/options', {}, u.cookie);
    const assertion = authn.assert(opt.data.options);
    expect((await checkIn(u, { assertion })).status).toBe(200);
    expect((await checkIn(u, { assertion })).status).toBe(401);
  });

  it('rejects an assertion made for a different purpose or another session', async () => {
    const u = await newUser();
    const authn = await enrollPasskey(u);
    await addLifeline(u);
    await call('POST', '/protection/arm', {}, u.cookie);
    const stepOpt = await call('POST', '/auth/stepup/options', {}, u.cookie);
    expect((await checkIn(u, { assertion: authn.assert(stepOpt.data.options) })).status).toBe(401);

    const other = await call('POST', '/auth/login', { email: u.email, password: u.password });
    const o = await call('POST', '/auth/login/passkey/options', {}, other.cookie);
    await call('POST', '/auth/login/passkey/verify', { assertion: authn.assert(o.data.options) }, other.cookie);
    const opt = await call('POST', '/checkin/options', {}, other.cookie); // challenge issued to the other session
    expect((await checkIn(u, { assertion: authn.assert(opt.data.options) })).status).toBe(401);
  });

  it('rejects an expired challenge, a missing user-verification flag and an unknown device', async () => {
    const u = await newUser();
    const authn = await enrollPasskey(u);
    await addLifeline(u);
    await call('POST', '/protection/arm', {}, u.cookie);
    let opt = await call('POST', '/checkin/options', {}, u.cookie);
    travel(6 * 60);
    expect((await checkIn(u, { assertion: authn.assert(opt.data.options) })).status).toBe(401);
    opt = await call('POST', '/checkin/options', {}, u.cookie);
    expect((await checkIn(u, { assertion: authn.assert(opt.data.options, { userVerified: false }) })).status).toBe(401);
    opt = await call('POST', '/checkin/options', {}, u.cookie);
    expect((await checkIn(u, { assertion: makeAuthenticator().assert(opt.data.options) })).status).toBe(401);
  });

  it('needs fresh identity confirmation to enroll another device once protection is on', async () => {
    const u = await armed();
    const authn = makeAuthenticator();
    const { data } = await call('POST', '/passkeys/options', {}, u.cookie);
    const r = await call('POST', '/passkeys', { response: authn.register(data.options) }, u.cookie);
    expect(r.status).toBe(403);
    expect(r.data.error.code).toBe('STEP_UP_REQUIRED');
    expect((await stepUp({ ...u, password: 'wrong password!' })).status).toBe(401);
    expect((await stepUp(u)).status).toBe(200);
    const again = await call('POST', '/passkeys/options', {}, u.cookie);
    expect((await call('POST', '/passkeys', { response: authn.register(again.data.options) }, u.cookie)).status).toBe(200);
  });
});

describe('data isolation between users', () => {
  it('one user cannot read or change another user\'s records', async () => {
    const a = await armed(1);
    const b = await newUser();
    const id = a.contacts[0].id;
    expect((await call('PUT', `/contacts/${id}`, { name: 'Hijack', email: 'evil@example.test', channels: ['email'] }, b.cookie)).status).toBe(404);
    expect((await call('DELETE', `/contacts/${id}`, undefined, b.cookie)).status).toBe(404);
    const mine = await call('GET', '/contacts', undefined, b.cookie);
    expect(mine.data.contacts).toEqual([]);
    const hist = await call('GET', '/history', undefined, b.cookie);
    expect(hist.data.notifications.every((n: any) => n.recipient === b.email)).toBe(true);
    const log = await call('GET', '/audit', undefined, b.cookie);
    const aTypes = (await rows(`select hash from audit_events where user_id = $1`, [a.userId])).map((r) => r.hash);
    expect(log.data.events.some((e: any) => aTypes.includes(e.hash))).toBe(false);
    const [c] = await rows(`select name, email from contacts where id = $1`, [id]);
    expect(c.name).not.toBe('Hijack');
  });
});
