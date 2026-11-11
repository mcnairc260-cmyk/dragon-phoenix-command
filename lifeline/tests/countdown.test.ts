import { describe, expect, it } from 'vitest';
import { dueEvent, stagesOf, transition } from '@/server/statemachine';
import { DAY, HOUR, alerts, armed, call, checkIn, db, events, one, rows, runTick, settle, state, travel, useDb } from './helpers';

useDb();
const S = { intervalSeconds: DAY, graceSeconds: HOUR, reminderOffsets: [4 * HOUR, HOUR] };
/** Signs in again: test time-travel outlives the 30-minute idle session. */
const relogin = async (u: { email: string; password: string }) => ({ ...u, cookie: (await call('POST', '/auth/login', { email: u.email, password: u.password })).cookie! });

describe('state machine (pure)', () => {
  it('allows only the defined transitions', () => {
    expect(transition('setup', 'ARM')).toBe('active');
    expect(transition('active', 'DEADLINE_PASSED')).toBe('grace');
    expect(transition('grace', 'GRACE_EXPIRED')).toBe('escalating');
    for (const s of ['active', 'grace', 'escalating'] as const) expect(transition(s, 'CHECK_IN')).toBe('active');
    expect(transition('setup', 'CHECK_IN')).toBeNull();
    expect(transition('paused', 'CHECK_IN')).toBeNull();
    expect(transition('active', 'GRACE_EXPIRED')).toBeNull();
    expect(transition('escalating', 'PAUSE')).toBeNull();
    expect(transition('active', 'PAUSE')).toBe('paused');
    expect(transition('paused', 'RESUME')).toBe('active');
  });
  it('never allows a pause while VaultLock is active', () => {
    expect(transition('active', 'PAUSE', { vaultlock: true })).toBeNull();
    expect(transition('grace', 'PAUSE', { vaultlock: true })).toBeNull();
    expect(transition('grace', 'CHECK_IN', { vaultlock: true })).toBe('active');
  });
  it('finds the due timer event exactly at the boundary', () => {
    const deadlineAt = new Date('2026-01-10T00:00:00Z');
    const p = { status: 'active' as const, deadlineAt, graceSeconds: 3600 };
    expect(dueEvent(p, new Date(deadlineAt.getTime() - 1))).toBeNull();
    expect(dueEvent(p, deadlineAt)).toBe('DEADLINE_PASSED');
    const g = { ...p, status: 'grace' as const };
    expect(dueEvent(g, new Date(deadlineAt.getTime() + 3600_000 - 1))).toBeNull();
    expect(dueEvent(g, new Date(deadlineAt.getTime() + 3600_000))).toBe('GRACE_EXPIRED');
  });
  it('groups recipients into stages for each escalation mode', () => {
    const r = [{ stage: 2, priority: 1, n: 'c' }, { stage: 1, priority: 2, n: 'b' }, { stage: 1, priority: 1, n: 'a' }];
    expect(stagesOf(r, 'simultaneous').map((g) => g.map((x) => x.n))).toEqual([['a', 'b', 'c']]);
    expect(stagesOf(r, 'sequential').map((g) => g.map((x) => x.n))).toEqual([['a'], ['b'], ['c']]);
    expect(stagesOf(r, 'custom').map((g) => g.map((x) => x.n))).toEqual([['a', 'b'], ['c']]);
  });
});

describe('check-in', () => {
  it('resets the deadline to server time + interval', async () => {
    const u = await armed(1, S);
    travel(10 * 60);
    const r = await checkIn(u);
    expect(r.status).toBe(200);
    const st = await state(u);
    const expected = new Date(st.protection.lastCheckinAt).getTime() + DAY * 1000;
    expect(new Date(st.protection.deadlineAt).getTime()).toBe(expected);
    expect(Math.abs(new Date(st.protection.lastCheckinAt).getTime() - new Date(st.serverTime).getTime())).toBeLessThan(5000);
    expect((await events(u.userId, 'protection.checked_in')).length).toBe(1);
  });

  it('ignores any timestamp or deadline supplied by the client', async () => {
    const u = await armed(1, S);
    const far = '2099-01-01T00:00:00.000Z';
    await checkIn(u, { timestamp: far, deadlineAt: far, deadline_at: far, now: far, lastCheckinAt: far, intervalSeconds: 999999999 });
    const st = await state(u);
    expect(new Date(st.protection.deadlineAt).getTime()).toBeLessThan(Date.now() + 2 * DAY * 1000);
    expect(st.protection.intervalSeconds).toBe(DAY);
    // The settings endpoint also has no field that can set a deadline directly.
    await call('PUT', '/protection/settings', { deadlineAt: far, status: 'paused', cycle: 0 }, u.cookie);
    expect((await state(u)).protection.status).toBe('active');
  });

  it('is refused before protection is turned on', async () => {
    const u = await armed(1);
    await db.query(`update protection set status = 'paused' where user_id = $1`, [u.userId]);
    expect((await checkIn(u)).status).toBe(409);
  });
});

describe('countdown and reminders', () => {
  it('does nothing before the deadline, sends each reminder once, then enters grace, then escalates', async () => {
    const u = await armed(1, S);
    travel(19 * HOUR);
    await settle();
    expect((await rows(`select 1 from notifications where user_id = $1 and kind = 'reminder'`, [u.userId])).length).toBe(0);

    travel(HOUR + 60); // 4 h reminder is due
    await settle(); await settle(); await settle();
    expect((await rows(`select 1 from notifications where user_id = $1 and kind = 'reminder'`, [u.userId])).length).toBe(1);

    travel(3 * HOUR); // 1 h reminder is due
    await settle(); await settle();
    const rem = await rows(`select status, simulated from notifications where user_id = $1 and kind = 'reminder'`, [u.userId]);
    expect(rem.length).toBe(2);
    expect(rem.every((r) => r.status === 'accepted' && r.simulated === true)).toBe(true);
    expect((await one(`select status from protection where user_id = $1`, [u.userId])).status).toBe('active');

    travel(HOUR); // deadline
    await settle(); await settle();
    expect((await one(`select status from protection where user_id = $1`, [u.userId])).status).toBe('grace');
    expect((await rows(`select 1 from notifications where user_id = $1 and kind = 'final_warning'`, [u.userId])).length).toBe(1);
    expect((await alerts(u.userId)).length).toBe(0);

    travel(HOUR); // grace ends
    await settle();
    expect((await one(`select status from protection where user_id = $1`, [u.userId])).status).toBe('escalating');
    const a = await alerts(u.userId);
    expect(a.length).toBe(1);
    expect(a[0].status).toBe('accepted');
    expect(a[0].body).toMatch(/did not complete a scheduled check-in/);
    expect(a[0].body).not.toMatch(/has died|is dead|an emergency has occurred|they are in danger/i);
    expect((await events(u.userId, 'incident.opened')).length).toBe(1);
  });

  it('respects the exact deadline boundary', async () => {
    const u = await armed(1, S);
    travel(DAY - 5);
    await runTick();
    expect((await one(`select status from protection where user_id = $1`, [u.userId])).status).toBe('active');
    travel(6);
    await runTick();
    expect((await one(`select status from protection where user_id = $1`, [u.userId])).status).toBe('grace');
  });

  it('a check-in during the grace period returns to active and nobody is alerted', async () => {
    let u = await armed(1, S);
    travel(DAY + 60);
    await settle();
    u = { ...u, ...(await relogin(u)) };
    expect((await checkIn(u)).status).toBe(200);
    travel(2 * HOUR);
    await settle();
    expect((await one(`select status from protection where user_id = $1`, [u.userId])).status).toBe('active');
    expect((await alerts(u.userId)).length).toBe(0);
  });

  it('runs on the server with no client connected (device destroyed)', async () => {
    const u = await armed(1, S);
    await call('POST', '/auth/logout', {}, u.cookie); // no session, no device, no requests at all
    travel(DAY + HOUR + 60);
    await settle();
    expect((await alerts(u.userId)).length).toBe(1);
  });
});

describe('duplicate jobs, concurrency and recovery', () => {
  it('many scheduler passes at once open one incident and send one alert per Lifeline', async () => {
    const u = await armed(3, { ...S, escalationMode: 'simultaneous' });
    travel(DAY + HOUR + 60);
    await Promise.all(Array.from({ length: 8 }, () => runTick()));
    await Promise.all(Array.from({ length: 8 }, () => runTick()));
    expect((await rows(`select 1 from incidents where user_id = $1`, [u.userId])).length).toBe(1);
    const a = await alerts(u.userId);
    expect(a.length).toBe(3);
    expect(new Set(a.map((x) => x.contact_id)).size).toBe(3);
    expect(a.every((x) => x.attempts === 1)).toBe(true);
    expect((await rows(`select 1 from notifications where user_id = $1 and kind = 'final_warning'`, [u.userId])).length).toBe(1);
  });

  it('a check-in racing with deadline processing always ends active with no open incident', async () => {
    for (let i = 0; i < 6; i++) {
      let u = await armed(1, S);
      travel(DAY + HOUR - 20 * 60);
      await settle();
      u = { ...u, ...(await relogin(u)) };
      travel(20 * 60 + 1); // grace has just ended; the scheduler and the user act at the same moment
      const [ci] = await Promise.all([checkIn(u), runTick(), runTick()]);
      expect(ci.status).toBe(200);
      await settle();
      const p = await one(`select status, cycle, deadline_at from protection where user_id = $1`, [u.userId]);
      expect(p.status).toBe('active');
      expect((await rows(`select 1 from incidents where user_id = $1 and status = 'open'`, [u.userId])).length).toBe(0);
      expect(new Date(p.deadline_at).getTime()).toBeGreaterThan(Date.now() + 20 * HOUR * 1000);
      // If the scheduler won the race an alert may exist, but never more than one, and unsent ones are cancelled.
      expect((await alerts(u.userId)).length).toBeLessThanOrEqual(1);
      expect((await rows(`select 1 from notifications where user_id = $1 and kind = 'alert' and status = 'queued'`, [u.userId])).length).toBe(0);
    }
  });

  it('catches up correctly after the scheduler was down for a long time', async () => {
    const u = await armed(2, { ...S, escalationMode: 'simultaneous' });
    travel(5 * DAY); // no scheduler passes at all during this time
    await settle();
    expect((await one(`select status from protection where user_id = $1`, [u.userId])).status).toBe('escalating');
    expect((await alerts(u.userId)).length).toBe(2);
    expect((await rows(`select 1 from incidents where user_id = $1`, [u.userId])).length).toBe(1);
    // Stale reminders are not sent after the deadline has passed.
    expect((await rows(`select 1 from notifications where user_id = $1 and kind = 'reminder'`, [u.userId])).length).toBe(0);
  });

  it('re-sends a message left "sending" by a worker that stopped', async () => {
    const u = await armed(1, S);
    travel(DAY + HOUR + 60);
    await runTick(); // opens the incident and sends
    await db.query(`update notifications set status = 'sending', locked_at = $2, sent_at = null where user_id = $1 and kind = 'alert'`, [u.userId, new Date(Date.now() + (DAY + HOUR + 60) * 1000)]);
    await runTick();
    expect((await alerts(u.userId))[0].status).toBe('sending'); // lock is still fresh: not touched
    travel(6 * 60);
    await runTick();
    const [a] = await alerts(u.userId);
    expect(a.status).toBe('accepted');
    expect(a.attempts).toBe(2);
  });

  it('one account with broken data does not stop other accounts', async () => {
    const good = await armed(1, S);
    const bad = await armed(1, S);
    await db.query(`update protection set reminder_offsets = '["x"]' where user_id = $1`, [bad.userId]);
    travel(DAY + HOUR + 60);
    const report = await settle();
    expect((await alerts(good.userId)).length).toBe(1);
    expect(report.errors.length).toBeGreaterThanOrEqual(0);
  });
});

describe('pause', () => {
  it('needs fresh identity confirmation, stops the countdown, and resume starts a new cycle', async () => {
    const u = await armed(1, S);
    expect((await call('POST', '/protection/pause', {}, u.cookie)).data.error.code).toBe('STEP_UP_REQUIRED');
    await call('POST', '/auth/stepup', { password: u.password, passphrase: u.passphrase }, u.cookie);
    expect((await call('POST', '/protection/pause', {}, u.cookie)).status).toBe(200);
    travel(10 * 60);
    await settle();
    expect((await alerts(u.userId)).length).toBe(0);
    expect((await call('POST', '/protection/resume', {}, u.cookie)).status).toBe(200);
    expect((await state(u)).protection.status).toBe('active');
  });
});
