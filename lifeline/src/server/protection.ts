import { z } from 'zod';
import { LIMITS, config, now } from './config';
import { audit } from './audit';
import { requireStepUp, type Session } from './auth';
import { planFor } from './billing';
import { listContacts } from './contacts';
import type { Db } from './db';
import { resolveIncident } from './engine';
import { AppError, fromDbError } from './errors';
import { listPasskeys, verifyPresence, type Proof } from './passkeys';
import { transition, type Status } from './statemachine';
import { pendingRecovery, verifySealed } from './vaultlock';

const settingsSchema = z.object({
  intervalSeconds: z.number().int().min(LIMITS.minIntervalSeconds).max(LIMITS.maxIntervalSeconds),
  graceSeconds: z.number().int().min(0).max(LIMITS.maxGraceSeconds),
  reminderOffsets: z.array(z.number().int().min(300)).max(5),
  escalationMode: z.enum(['simultaneous', 'sequential', 'custom']),
  stageWaitSeconds: z.number().int().min(300).max(7 * 86400),
}).partial();
export type SettingsInput = z.input<typeof settingsSchema>;

const blocked = async (db: Db, s: Session, action: string, layer = 'api'): Promise<never> => {
  await audit(db, { userId: s.userId, actor: 'user', type: 'vaultlock.blocked_attempt', detail: { action, layer } });
  throw new AppError('VAULTLOCKED', 'This setting is sealed by VaultLock. It cannot be changed from a normal session.');
};

export async function getState(db: Db, s: Session) {
  const [p] = await db.query(`select * from protection where user_id = $1`, [s.userId]);
  const contacts = await listContacts(db, s.userId);
  const passkeys = await listPasskeys(db, s.userId);
  const [incident] = await db.query(`select id, stage, next_stage_at, opened_at, integrity from incidents where user_id = $1 and status = 'open'`, [s.userId]);
  const sealed = p.vaultlock_active ? await verifySealed(db, s.userId) : null;
  const plan = planFor(s.plan);
  const deadline = p.deadline_at ? new Date(p.deadline_at) : null;
  return {
    serverTime: now().toISOString(), demoMode: config.demoMode,
    user: { email: s.email, name: s.name, emailVerified: s.emailVerified, hasPassphrase: s.hasPassphrase, plan: plan.id, subStatus: s.subStatus },
    plan,
    protection: {
      status: p.status as Status, intervalSeconds: p.interval_seconds, graceSeconds: p.grace_seconds, reminderOffsets: p.reminder_offsets as number[],
      escalationMode: p.escalation_mode, stageWaitSeconds: p.stage_wait_seconds, cycle: p.cycle, armedAt: p.armed_at,
      lastCheckinAt: p.last_checkin_at, deadlineAt: deadline, graceEndsAt: deadline ? new Date(deadline.getTime() + p.grace_seconds * 1000) : null,
    },
    vaultlock: sealed ? { active: true, version: sealed.version, sealedAt: sealed.sealedAt, policyHash: sealed.policyHash, integrity: sealed.integrity, differences: sealed.differences } : { active: false },
    recovery: await pendingRecovery(db, s.userId),
    contacts, passkeys, incident: incident ?? null,
    readiness: {
      emailVerified: s.emailVerified, passphrase: s.hasPassphrase, passkey: passkeys.length > 0 || config.demoMode,
      passkeyEnrolled: passkeys.length > 0, lifeline: contacts.length > 0, consentingLifeline: contacts.some((c) => c.consent_status === 'granted'),
    },
    stepUpActive: !!s.stepupAt && now().getTime() - new Date(s.stepupAt).getTime() < LIMITS.stepUpSeconds * 1000,
  };
}

/** Changes the schedule. A new interval applies from the next check-in; the current deadline does not move. */
export async function updateSettings(db: Db, s: Session, input: SettingsInput) {
  const patch = settingsSchema.parse(input);
  const [cur] = await db.query(`select * from protection where user_id = $1`, [s.userId]);
  if (cur.vaultlock_active) await blocked(db, s, 'settings.update');
  if (cur.status !== 'setup') requireStepUp(s);
  const plan = planFor(s.plan);
  const next = {
    interval: patch.intervalSeconds ?? cur.interval_seconds, grace: patch.graceSeconds ?? cur.grace_seconds,
    offsets: [...new Set(patch.reminderOffsets ?? (cur.reminder_offsets as number[]))].sort((a, b) => b - a),
    mode: patch.escalationMode ?? cur.escalation_mode, wait: patch.stageWaitSeconds ?? cur.stage_wait_seconds,
  };
  if (next.grace > next.interval) throw new AppError('BAD_REQUEST', 'The grace period cannot be longer than the check-in interval.');
  if (next.offsets.some((o) => o >= next.interval)) throw new AppError('BAD_REQUEST', 'A reminder must be closer to the deadline than one full interval.');
  if (next.offsets.length > plan.maxReminders) throw new AppError('PLAN_LIMIT', `Your ${plan.name} plan allows ${plan.maxReminders} reminders.`);
  if (next.mode === 'custom' && !plan.customEscalation) throw new AppError('PLAN_LIMIT', 'Custom escalation stages need the Premium plan.');
  try {
    await db.tx(async (q) => {
      await q.query(
        `update protection set interval_seconds=$2, grace_seconds=$3, reminder_offsets=$4::jsonb, escalation_mode=$5, stage_wait_seconds=$6, updated_at=$7 where user_id=$1`,
        [s.userId, next.interval, next.grace, JSON.stringify(next.offsets), next.mode, next.wait, now()]);
      await audit(q, { userId: s.userId, actor: 'user', type: 'protection.settings_changed', detail: next });
    });
  } catch (e) {
    if (fromDbError(e)?.code === 'VAULTLOCKED') await blocked(db, s, 'settings.update', 'database');
    throw e;
  }
}

async function move(db: Db, s: Session, event: 'ARM' | 'PAUSE' | 'RESUME') {
  return db.tx(async (q) => {
    const [p] = await q.query(`select * from protection where user_id = $1 for update`, [s.userId]);
    const next = transition(p.status, event, { vaultlock: p.vaultlock_active });
    if (!next) throw new AppError('CONFLICT', `Protection is "${p.status}"; this action is not available.`);
    const t = now();
    if (event === 'PAUSE') {
      await q.query(`update protection set status = 'paused', deadline_at = null, updated_at = $2 where user_id = $1`, [s.userId, t]);
    } else {
      // Start a fresh cycle. The deadline is computed from server time only.
      await q.query(
        `update protection set status = 'active', cycle = cycle + 1, armed_at = coalesce(armed_at, $2), last_checkin_at = $2,
           deadline_at = $2::timestamptz + (interval_seconds * interval '1 second'), updated_at = $2 where user_id = $1`, [s.userId, t]);
    }
    await audit(q, { userId: s.userId, actor: 'user', type: `protection.${event.toLowerCase()}`, detail: { from: p.status, to: next } });
  });
}

export async function arm(db: Db, s: Session) {
  const st = await getState(db, s);
  if (!st.readiness.emailVerified) throw new AppError('NOT_READY', 'Confirm your email address first.');
  if (!st.readiness.passphrase) throw new AppError('NOT_READY', 'Set your check-in passphrase first.');
  if (!st.readiness.passkey) throw new AppError('NOT_READY', 'Enroll a passkey on this device first.');
  if (!st.readiness.lifeline) throw new AppError('NOT_READY', 'Add at least one Lifeline first.');
  await move(db, s, 'ARM');
}

export async function pause(db: Db, s: Session) {
  const [p] = await db.query(`select vaultlock_active from protection where user_id = $1`, [s.userId]);
  if (p.vaultlock_active) await blocked(db, s, 'protection.pause');
  requireStepUp(s);
  await move(db, s, 'PAUSE');
}

export async function resume(db: Db, s: Session) {
  await move(db, s, 'RESUME');
}

/**
 * The verified check-in. Identity is proven first (passphrase + passkey), then
 * one transaction locks the protection row, starts the next cycle from SERVER
 * time and resolves any open incident. The request body carries no timestamp.
 */
export async function checkIn(db: Db, s: Session, proof: Proof) {
  const device = await verifyPresence(db, s, proof, 'checkin');
  return db.tx(async (q) => {
    const [p] = await q.query(`select * from protection where user_id = $1 for update`, [s.userId]);
    if (!transition(p.status, 'CHECK_IN')) throw new AppError('NOT_READY', 'Protection is not turned on.');
    const t = now();
    const [n] = await q.query(
      `update protection set status = 'active', cycle = cycle + 1, last_checkin_at = $2,
         deadline_at = $2::timestamptz + (interval_seconds * interval '1 second'), updated_at = $2
       where user_id = $1 returning deadline_at, cycle`, [s.userId, t]);
    const resolved = await resolveIncident(q, s.userId, 'checked_in');
    await audit(q, { userId: s.userId, actor: 'user', type: 'protection.checked_in', detail: { cycle: n.cycle, device, from: p.status, resolvedIncident: resolved } });
    return { deadlineAt: n.deadline_at as Date, device, resolvedIncident: !!resolved };
  });
}
