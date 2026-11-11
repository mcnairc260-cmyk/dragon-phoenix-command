import { randomUUID } from 'node:crypto';
import { LIMITS, now } from './config';
import { audit } from './audit';
import { planFor } from './billing';
import { randomToken, sha256 } from './crypto';
import type { Db, Q } from './db';
import { AppError } from './errors';
import { enqueue } from './notify/outbox';
import { providerFor, type Channel } from './notify/providers';
import { dueEvent, stagesOf, transition, type Status } from './statemachine';
import { tpl } from './templates';
import { verifySealed, type PolicyRecipient } from './vaultlock';

// The engine is driven only by rows in the database and by server time. Every
// step re-checks its condition while holding a row lock, and every side effect
// has a unique key, so running a step twice (or two workers at once, or after
// an outage) cannot send a duplicate alert or open a second incident.

interface IncidentPolicy { mode: string; stageWaitSeconds: number; recipients: PolicyRecipient[]; deadlineAt: string }
const ALERT_KINDS = ['alert'];
const secs = (d: Date, s: number) => new Date(d.getTime() + s * 1000);
const userOf = async (q: Q, id: string) => (await q.query(`select id, email, name, plan from users where id = $1`, [id]))[0];

async function monthlyCount(q: Q, userId: string, channel: string) {
  const t = now();
  const start = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1));
  const [{ n }] = await q.query<{ n: number }>(
    `select count(*)::int n from notifications where user_id = $1 and channel = $2 and created_at >= $3 and status <> 'suppressed'`, [userId, channel, start]);
  return n;
}

/** Sends one stage. Returns how many messages were queued. Consent is always read live, so an opt-out is honoured even when the policy is sealed. */
async function dispatchStage(q: Q, incident: { id: string; user_id: string; policy: IncidentPolicy }, stageIndex: number) {
  const user = await userOf(q, incident.user_id);
  const plan = planFor(user.plan);
  const group = stagesOf(incident.policy.recipients, incident.policy.mode)[stageIndex - 1] ?? [];
  let queued = 0;
  for (const r of group) {
    const [c] = await q.query(`select consent_status, consent_channels, consent_token_hash, removed_at from contacts where id = $1 and user_id = $2`, [r.id, incident.user_id]);
    const consented: string[] = c && c.consent_status === 'granted' && !c.removed_at ? c.consent_channels : [];
    for (const channel of r.channels as Channel[]) {
      const key = `alert:${incident.id}:${r.id}:${channel}`;
      const to = channel === 'email' ? r.email : r.phone ?? '';
      const base = { userId: incident.user_id, incidentId: incident.id, contactId: r.id, kind: 'alert', channel, recipient: to, stage: stageIndex, dedupeKey: key };
      let reason = '';
      if (!consented.includes(channel)) reason = `No consent from this Lifeline for ${channel}.`;
      else if (!to) reason = 'No address for this channel.';
      else if (channel === 'sms' && (await monthlyCount(q, incident.user_id, 'sms')) >= plan.smsPerMonth) reason = 'Monthly text message limit reached.';
      else if (channel === 'voice' && (await monthlyCount(q, incident.user_id, 'voice')) >= plan.voicePerMonth) reason = 'Monthly call limit reached.';
      if (reason) {
        await enqueue(q, { ...base, body: '(not sent)', status: 'suppressed', reason });
        continue;
      }
      const ack = randomToken();
      const deadline = new Date(incident.policy.deadlineAt);
      const content = channel === 'email' ? tpl.alert(user.name || user.email, r.name, r.message, deadline, ack)
        : { subject: '', body: channel === 'sms' ? tpl.alertSms(user.name || user.email, ack) : tpl.alertVoice(user.name || user.email) };
      if (await enqueue(q, { ...base, ...content, ackTokenHash: sha256(ack) })) queued++;
    }
  }
  return queued;
}

/** Sends the next stage that reaches at least one person, then schedules the one after it. */
async function advance(q: Q, incident: { id: string; user_id: string; policy: IncidentPolicy; stage: number }) {
  const total = stagesOf(incident.policy.recipients, incident.policy.mode).length;
  let stage = incident.stage, queued = 0;
  while (stage < total && queued === 0) queued = await dispatchStage(q, incident, ++stage);
  const next = stage < total ? secs(now(), incident.policy.stageWaitSeconds) : null;
  await q.query(`update incidents set stage = $2, next_stage_at = $3 where id = $1`, [incident.id, stage, next]);
  await audit(q, { userId: incident.user_id, actor: 'system', type: 'incident.stage_dispatched', detail: { incidentId: incident.id, stage, queued } });
  return queued;
}

async function openIncident(q: Q, p: any) {
  const sealed = await verifySealed(q, p.user_id);
  let recipients: PolicyRecipient[]; let mode = p.escalation_mode; let wait = p.stage_wait_seconds; let integrity = 'unsealed';
  if (sealed?.config) {
    // Under VaultLock the sealed snapshot — not the live tables — decides who is notified.
    ({ recipients } = sealed.config); mode = sealed.config.escalationMode; wait = sealed.config.stageWaitSeconds; integrity = sealed.integrity;
  } else {
    recipients = (await q.query(`select * from contacts where user_id = $1 and removed_at is null`, [p.user_id]))
      .map((c) => ({ id: c.id, name: c.name, relationship: c.relationship, email: c.email, phone: c.phone, channels: c.channels, stage: c.stage, priority: c.priority, message: c.message }));
    if (sealed) integrity = sealed.integrity;
  }
  if (sealed && sealed.integrity !== 'ok') {
    await audit(q, { userId: p.user_id, actor: 'system', type: 'vaultlock.tamper_detected', detail: { integrity: sealed.integrity, differences: sealed.differences, policyId: sealed.policyId } });
  }
  const policy: IncidentPolicy = { mode, stageWaitSeconds: wait, recipients, deadlineAt: new Date(p.deadline_at).toISOString() };
  const id = randomUUID();
  const made = await q.query(
    `insert into incidents (id, user_id, cycle, policy, integrity, opened_at) values ($1,$2,$3,$4::jsonb,$5,$6)
     on conflict (user_id, cycle) do nothing returning id`, [id, p.user_id, p.cycle, JSON.stringify(policy), integrity, now()]);
  if (!made.length) return false; // another worker already opened this incident
  await q.query(`update protection set status = 'escalating', updated_at = $2 where user_id = $1`, [p.user_id, now()]);
  await audit(q, { userId: p.user_id, actor: 'system', type: 'incident.opened', detail: { incidentId: id, cycle: p.cycle, integrity, recipients: recipients.length } });
  const user = await userOf(q, p.user_id);
  const queued = await advance(q, { id, user_id: p.user_id, policy, stage: 0 });
  await enqueue(q, { userId: p.user_id, incidentId: id, kind: queued ? 'escalation_notice' : 'no_recipients', channel: 'email', recipient: user.email,
    ...(queued ? tpl.escalationNotice() : tpl.noRecipients()), dedupeKey: `esc-notice:${id}` });
  return true;
}

/** Called inside the check-in transaction. Stops what is not sent yet; says so honestly to people already alerted. */
export async function resolveIncident(q: Q, userId: string, resolution: string) {
  const [inc] = await q.query(`select * from incidents where user_id = $1 and status = 'open' for update`, [userId]);
  if (!inc) return null;
  const t = now();
  await q.query(`update incidents set status = 'resolved', resolved_at = $2, resolution = $3, next_stage_at = null where id = $1`, [inc.id, t, resolution]);
  const cancelled = await q.query(
    `update notifications set status = 'cancelled', last_error = 'Incident resolved before sending.' where incident_id = $1 and kind = 'alert' and status = 'queued' returning id`, [inc.id]);
  const user = await userOf(q, userId);
  const reached = await q.query(
    `select distinct n.contact_id, c.name, c.email from notifications n join contacts c on c.id = n.contact_id
      where n.incident_id = $1 and n.kind = 'alert' and n.status in ('sending','accepted','delivered')
        and c.consent_status = 'granted' and c.consent_channels ? 'email'`, [inc.id]);
  for (const c of reached) {
    await enqueue(q, { userId, incidentId: inc.id, contactId: c.contact_id, kind: 'all_clear', channel: 'email', recipient: c.email,
      ...tpl.allClear(user.name || user.email, c.name, t), dedupeKey: `allclear:${inc.id}:${c.contact_id}` });
  }
  await audit(q, { userId, actor: 'system', type: 'incident.resolved', detail: { incidentId: inc.id, resolution, cancelledUnsent: cancelled.length, allClearSent: reached.length } });
  return inc.id as string;
}

/** A Lifeline confirms they received an alert. This stops later stages. It does NOT mean the user is safe, and does not resolve the incident. */
export async function acknowledge(db: Db, token: string) {
  return db.tx(async (q) => {
    const [n] = await q.query(
      `select n.id, n.incident_id, n.user_id, n.contact_id, n.acknowledged_at, u.name as user_name, i.status as incident_status
         from notifications n join users u on u.id = n.user_id join incidents i on i.id = n.incident_id
        where n.ack_token_hash = $1 for update of n`, [sha256(token)]);
    if (!n) throw new AppError('NOT_FOUND', 'This link is not valid.');
    if (!n.acknowledged_at) {
      await q.query(`update notifications set acknowledged_at = $2 where id = $1`, [n.id, now()]);
      await q.query(`update incidents set next_stage_at = null where id = $1 and status = 'open'`, [n.incident_id]);
      await audit(q, { userId: n.user_id, actor: 'lifeline', type: 'incident.acknowledged', detail: { incidentId: n.incident_id, contactId: n.contact_id } });
    }
    return { requestedBy: n.user_name || 'A Lifeline member', resolved: n.incident_status === 'resolved' };
  });
}

export const ackInfo = async (db: Db, token: string) => {
  const [n] = await db.query(
    `select n.acknowledged_at, u.name as user_name, i.status from notifications n join users u on u.id = n.user_id
       join incidents i on i.id = n.incident_id where n.ack_token_hash = $1`, [sha256(token)]);
  if (!n) throw new AppError('NOT_FOUND', 'This link is not valid.');
  return { requestedBy: n.user_name || 'A Lifeline member', acknowledged: !!n.acknowledged_at, resolved: n.status === 'resolved' };
};

export interface TickReport { reminders: number; deadlines: number; incidents: number; stages: number; sent: number; failed: number; errors: string[] }

async function each(report: TickReport, ids: string[], fn: (id: string) => Promise<void>) {
  for (const id of ids) {
    try {
      await fn(id);
    } catch (e) {
      report.errors.push(e instanceof Error ? e.message : String(e)); // one account's failure must not stop the others
    }
  }
}

async function stepReminders(db: Db, r: TickReport) {
  const t = now();
  const due = await db.query<{ user_id: string }>(
    `select user_id from protection p where status = 'active' and deadline_at > $1 and exists (
       select 1 from jsonb_array_elements_text(p.reminder_offsets) o where p.deadline_at - (o::int * interval '1 second') <= $1)`, [t]);
  await each(r, due.map((d) => d.user_id), (id) => db.tx(async (q) => {
    const [p] = await q.query(`select * from protection where user_id = $1 for update`, [id]);
    if (p.status !== 'active' || new Date(p.deadline_at) <= t) return;
    const left = (new Date(p.deadline_at).getTime() - t.getTime()) / 1000;
    // After an outage several reminders can be due together: send only the one nearest the deadline.
    const offset = (p.reminder_offsets as number[]).filter((o) => o >= left).sort((a, b) => a - b)[0];
    if (offset === undefined) return;
    const user = await userOf(q, id);
    if (await enqueue(q, { userId: id, kind: 'reminder', channel: 'email', recipient: user.email, ...tpl.reminder(new Date(p.deadline_at), left), dedupeKey: `reminder:${id}:${p.cycle}:${offset}` })) r.reminders++;
  }));
}

async function stepDeadlines(db: Db, r: TickReport) {
  const t = now();
  const due = await db.query<{ user_id: string }>(`select user_id from protection where status = 'active' and deadline_at <= $1`, [t]);
  await each(r, due.map((d) => d.user_id), (id) => db.tx(async (q) => {
    const [p] = await q.query(`select * from protection where user_id = $1 for update`, [id]);
    // Re-check under the lock: a check-in that committed first has moved the deadline.
    if (dueEvent({ status: p.status, deadlineAt: p.deadline_at && new Date(p.deadline_at), graceSeconds: p.grace_seconds }, t) !== 'DEADLINE_PASSED') return;
    const next = transition(p.status as Status, 'DEADLINE_PASSED', { vaultlock: p.vaultlock_active })!;
    await q.query(`update protection set status = $2, updated_at = $3 where user_id = $1`, [id, next, t]);
    const user = await userOf(q, id);
    await enqueue(q, { userId: id, kind: 'final_warning', channel: 'email', recipient: user.email, ...tpl.finalWarning(new Date(p.deadline_at), p.grace_seconds), dedupeKey: `final:${id}:${p.cycle}` });
    await audit(q, { userId: id, actor: 'system', type: 'protection.deadline_missed', detail: { cycle: p.cycle, deadlineAt: new Date(p.deadline_at).toISOString() } });
    r.deadlines++;
  }));
}

async function stepGrace(db: Db, r: TickReport) {
  const t = now();
  const due = await db.query<{ user_id: string }>(
    `select user_id from protection where status = 'grace' and deadline_at + (grace_seconds * interval '1 second') <= $1`, [t]);
  await each(r, due.map((d) => d.user_id), (id) => db.tx(async (q) => {
    const [p] = await q.query(`select * from protection where user_id = $1 for update`, [id]);
    if (dueEvent({ status: p.status, deadlineAt: p.deadline_at && new Date(p.deadline_at), graceSeconds: p.grace_seconds }, t) !== 'GRACE_EXPIRED') return;
    if (await openIncident(q, p)) r.incidents++;
  }));
}

async function stepStages(db: Db, r: TickReport) {
  const t = now();
  const due = await db.query<{ id: string }>(`select id from incidents where status = 'open' and next_stage_at <= $1`, [t]);
  await each(r, due.map((d) => d.id), (id) => db.tx(async (q) => {
    const [inc] = await q.query(`select * from incidents where id = $1 for update`, [id]);
    if (inc.status !== 'open' || !inc.next_stage_at || new Date(inc.next_stage_at) > t) return;
    const [{ n: acked }] = await q.query<{ n: number }>(`select count(*)::int n from notifications where incident_id = $1 and acknowledged_at is not null`, [id]);
    if (acked) {
      await q.query(`update incidents set next_stage_at = null where id = $1`, [id]);
      return;
    }
    await advance(q, inc as any);
    r.stages++;
  }));
}

/** Outbox worker. "accepted" means the provider took the message — it is not proof that a person received it. */
async function stepDispatch(db: Db, r: TickReport) {
  const t = now();
  // Recover messages left in "sending" by a worker that stopped mid-send.
  await db.query(`update notifications set status = 'queued', locked_at = null where status = 'sending' and locked_at < $1`, [secs(t, -LIMITS.sendingLockSeconds)]);
  const claimed = await db.tx((q) => q.query(
    `update notifications set status = 'sending', locked_at = $1, attempts = attempts + 1
      where id in (select id from notifications where status = 'queued' and next_attempt_at <= $1 order by created_at limit 50 for update skip locked)
      returning *`, [t]));
  for (const n of claimed) {
    try {
      if (ALERT_KINDS.includes(n.kind)) {
        const [st] = await db.query(
          `select i.status, c.consent_status, c.consent_channels from incidents i left join contacts c on c.id = $2 where i.id = $1`, [n.incident_id, n.contact_id]);
        const stop = st?.status !== 'open' ? 'Incident resolved before sending.'
          : st.consent_status !== 'granted' || !(st.consent_channels as string[]).includes(n.channel) ? 'Consent withdrawn before sending.' : '';
        if (stop) {
          await db.query(`update notifications set status = 'cancelled', last_error = $2, locked_at = null where id = $1`, [n.id, stop]);
          continue;
        }
      }
      const out = await providerFor(n.channel).send({ channel: n.channel, to: n.recipient, subject: n.subject, body: n.body, idempotencyKey: n.dedupe_key });
      await db.query(`update notifications set status = 'accepted', provider = $2, provider_ref = $3, simulated = $4, sent_at = $5, locked_at = null, last_error = null where id = $1`,
        [n.id, out.provider, out.ref, out.simulated, now()]);
      r.sent++;
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300);
      const final = n.attempts >= LIMITS.maxSendAttempts;
      await db.tx(async (q) => {
        await q.query(`update notifications set status = $2, last_error = $3, locked_at = null, next_attempt_at = $4 where id = $1`,
          [n.id, final ? 'failed' : 'queued', msg, final ? null : secs(now(), 30 * 4 ** (n.attempts - 1))]);
        if (final) await audit(q, { userId: n.user_id, actor: 'system', type: 'notification.failed', detail: { notificationId: n.id, kind: n.kind, channel: n.channel, attempts: n.attempts, error: msg } });
      });
      if (final) r.failed++;
    }
  }
}

/** One pass of the scheduler. Safe to call at any frequency and from several workers at once. */
export async function tick(db: Db): Promise<TickReport> {
  const r: TickReport = { reminders: 0, deadlines: 0, incidents: 0, stages: 0, sent: 0, failed: 0, errors: [] };
  for (const step of [stepReminders, stepDeadlines, stepGrace, stepStages, stepDispatch]) {
    try {
      await step(db, r);
    } catch (e) {
      r.errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  return r;
}

/** Provider delivery receipts (Twilio status callback). */
export async function recordDelivery(db: Db, providerRef: string, status: string) {
  const map: Record<string, string> = { delivered: 'delivered', completed: 'delivered', undelivered: 'failed', failed: 'failed', busy: 'failed', 'no-answer': 'failed' };
  if (!map[status]) return;
  await db.query(`update notifications set status = $2, last_error = case when $2 = 'failed' then $3 else last_error end where provider_ref = $1 and status in ('accepted','delivered')`,
    [providerRef, map[status], `Provider reported: ${status}`]);
}
