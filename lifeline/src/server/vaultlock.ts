import { randomBytes, randomUUID } from 'node:crypto';
import { config, now } from './config';
import { audit } from './audit';
import { createSession, emailSchema, issueToken, consumeToken, requireStepUp, type Meta, type Session } from './auth';
import { canonical, hashSecret, hmac, safeEqual, sha256, verifySecret } from './crypto';
import type { Db, Q } from './db';
import { AppError } from './errors';
import { enqueue } from './notify/outbox';
import { rateLimit } from './ratelimit';
import { tpl } from './templates';

export interface PolicyRecipient {
  id: string; name: string; relationship: string; email: string; phone: string | null;
  channels: string[]; stage: number; priority: number; message: string;
}
export interface PolicyConfig {
  intervalSeconds: number; graceSeconds: number; reminderOffsets: number[]; escalationMode: string; stageWaitSeconds: number;
  recipients: PolicyRecipient[]; credentialIds: string[]; passphraseFingerprint: string;
}

/** The protection configuration as it is in the live tables right now. */
export async function livePolicy(q: Q, userId: string): Promise<PolicyConfig> {
  const [p] = await q.query(`select * from protection where user_id = $1`, [userId]);
  const contacts = await q.query(`select * from contacts where user_id = $1 and removed_at is null order by id`, [userId]);
  const creds = await q.query(`select credential_id from webauthn_credentials where user_id = $1 order by credential_id`, [userId]);
  const [u] = await q.query(`select checkin_secret_hash from users where id = $1`, [userId]);
  return {
    intervalSeconds: p.interval_seconds, graceSeconds: p.grace_seconds, reminderOffsets: p.reminder_offsets,
    escalationMode: p.escalation_mode, stageWaitSeconds: p.stage_wait_seconds,
    recipients: contacts.map((c) => ({ id: c.id, name: c.name, relationship: c.relationship, email: c.email, phone: c.phone ?? null,
      channels: c.channels, stage: c.stage, priority: c.priority, message: c.message })),
    credentialIds: creds.map((c) => c.credential_id),
    passphraseFingerprint: sha256(u.checkin_secret_hash ?? ''),
  };
}

const newRecoveryKey = () => randomBytes(20).toString('hex').toUpperCase().match(/.{5}/g)!.join('-');
const normalizeKey = (k: string) => String(k ?? '').toUpperCase().replace(/[^0-9A-F]/g, '');

/**
 * Seals the current configuration. Stores a versioned snapshot with a SHA-256
 * hash and an HMAC made with a server key that is not in the database.
 * Returns the recovery key ONCE; only a memory-hard hash of it is kept.
 */
export async function seal(db: Db, s: Session, acknowledged: boolean) {
  requireStepUp(s);
  if (!acknowledged) throw new AppError('BAD_REQUEST', 'Confirm that you understand what VaultLock does.');
  const recoveryKey = newRecoveryKey();
  const recoveryHash = await hashSecret(normalizeKey(recoveryKey));
  return db.tx(async (q) => {
    const [p] = await q.query(`select * from protection where user_id = $1 for update`, [s.userId]);
    if (p.vaultlock_active) throw new AppError('CONFLICT', 'VaultLock is already active.');
    if (!['active', 'grace', 'escalating'].includes(p.status)) throw new AppError('NOT_READY', 'Turn on your protection before you seal it.');
    const cfg = await livePolicy(q, s.userId);
    const [{ n: consenting }] = await q.query<{ n: number }>(
      `select count(*)::int n from contacts where user_id = $1 and removed_at is null and consent_status = 'granted'`, [s.userId]);
    if (!consenting) throw new AppError('NOT_READY', 'At least one Lifeline must accept before you can seal. A sealed plan that reaches nobody could not be repaired quickly.');
    const [prev] = await q.query(`select version, policy_hash from sealed_policies where user_id = $1 order by version desc limit 1`, [s.userId]);
    const version = (prev?.version ?? 0) + 1;
    const sealedAt = now();
    const policy = canonical({ userId: s.userId, version, sealedAt: sealedAt.toISOString(), config: cfg });
    const policyHash = sha256(policy);
    const id = randomUUID();
    await q.query(
      `insert into sealed_policies (id, user_id, version, policy, policy_hash, mac, prev_policy_hash, recovery_key_hash, sealed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, s.userId, version, policy, policyHash, hmac('policy', policyHash), prev?.policy_hash ?? null, recoveryHash, sealedAt]);
    await q.query(`update protection set vaultlock_active = true, sealed_policy_id = $2, updated_at = $3 where user_id = $1`, [s.userId, id, sealedAt]);
    await audit(q, { userId: s.userId, actor: 'user', type: 'vaultlock.sealed', detail: { policyId: id, version, policyHash } });
    return { recoveryKey, version, policyHash };
  });
}

export interface SealedCheck {
  integrity: 'ok' | 'tamper_detected' | 'policy_invalid';
  config: PolicyConfig | null; policyId: string; version: number; policyHash: string; sealedAt: Date; differences: string[];
}

/**
 * Verifies the sealed policy: (1) the stored snapshot matches its hash and HMAC,
 * (2) the live tables still match the snapshot. Run before every escalation.
 */
export async function verifySealed(q: Q, userId: string): Promise<SealedCheck | null> {
  const [row] = await q.query(
    `select sp.* from protection p join sealed_policies sp on sp.id = p.sealed_policy_id where p.user_id = $1 and p.vaultlock_active`, [userId]);
  if (!row) return null;
  const base = { policyId: row.id, version: row.version, policyHash: row.policy_hash, sealedAt: row.sealed_at };
  if (sha256(row.policy) !== row.policy_hash || !safeEqual(hmac('policy', row.policy_hash), row.mac)) {
    return { ...base, integrity: 'policy_invalid', config: null, differences: ['sealed policy record failed its integrity check'] };
  }
  const sealed = JSON.parse(row.policy).config as PolicyConfig;
  const live = await livePolicy(q, userId);
  const differences = (Object.keys(sealed) as (keyof PolicyConfig)[]).filter((k) => canonical(sealed[k]) !== canonical(live[k]));
  return { ...base, integrity: differences.length ? 'tamper_detected' : 'ok', config: sealed, differences };
}

// ------------------------------------------------------------------ exceptional recovery
// Password + recovery key start a DELAYED release. Nothing changes during the delay,
// protection keeps running, and the user and their consenting Lifelines are told.
// Email-based password reset is not part of this path and cannot release VaultLock.

async function authenticateRecovery(db: Db, input: { email: string; password: string; recoveryKey: string }, meta: Meta) {
  await rateLimit(db, `recovery:ip:${meta.ip ?? 'unknown'}`, 10, 3600);
  const email = emailSchema.safeParse(input.email);
  if (email.success) await rateLimit(db, `recovery:email:${email.data}`, 5, 3600);
  const [u] = email.success ? await db.query(
    `select u.id, u.email, u.name, u.password_hash, sp.id as policy_id, sp.recovery_key_hash
       from users u left join protection p on p.user_id = u.id and p.vaultlock_active
       left join sealed_policies sp on sp.id = p.sealed_policy_id where lower(u.email) = $1`, [email.data]) : [];
  const pwOk = await verifySecret(String(input.password ?? ''), u?.password_hash);
  const keyOk = await verifySecret(normalizeKey(input.recoveryKey), u?.recovery_key_hash);
  if (!u || !pwOk || !keyOk || !u.policy_id) {
    if (u) await audit(db, { userId: u.id, actor: 'anonymous', type: 'vaultlock.recovery.auth_failed', detail: { ip: meta.ip } });
    throw new AppError('INVALID_CREDENTIALS', 'Those details are not correct, or VaultLock is not active on this account.');
  }
  return u;
}

export async function startRecovery(db: Db, input: { email: string; password: string; recoveryKey: string }, meta: Meta) {
  const u = await authenticateRecovery(db, input, meta);
  return db.tx(async (q) => {
    const [pending] = await q.query(`select effective_at from recovery_requests where user_id = $1 and status = 'pending' for update`, [u.id]);
    if (pending) return { effectiveAt: pending.effective_at as Date, alreadyPending: true };
    const t = now();
    const effectiveAt = new Date(t.getTime() + config.recoveryDelaySeconds * 1000);
    const id = randomUUID();
    await q.query(`insert into recovery_requests (id, user_id, policy_id, requested_at, effective_at, expires_at) values ($1,$2,$3,$4,$5,$6)`,
      [id, u.id, u.policy_id, t, effectiveAt, new Date(effectiveAt.getTime() + 7 * 86400 * 1000)]);
    const cancel = await issueToken(q, u.id, 'recovery_cancel', config.recoveryDelaySeconds + 7 * 86400);
    await enqueue(q, { userId: u.id, kind: 'recovery_notice', channel: 'email', recipient: u.email, ...tpl.recoveryStartedUser(effectiveAt, cancel), dedupeKey: `recovery:${id}:user` });
    const contacts = await q.query(`select id, name, email from contacts where user_id = $1 and removed_at is null and consent_status = 'granted'`, [u.id]);
    for (const c of contacts) {
      await enqueue(q, { userId: u.id, contactId: c.id, kind: 'recovery_notice', channel: 'email', recipient: c.email,
        ...tpl.recoveryStartedContact(u.name || u.email, c.name, effectiveAt), dedupeKey: `recovery:${id}:${c.id}` });
    }
    await audit(q, { userId: u.id, actor: 'user', type: 'vaultlock.recovery.requested', detail: { requestId: id, effectiveAt: effectiveAt.toISOString(), ip: meta.ip } });
    return { effectiveAt, alreadyPending: false };
  });
}

async function cancelFor(q: Q, userId: string, via: string) {
  const rows = await q.query(`update recovery_requests set status = 'cancelled', cancelled_at = $2 where user_id = $1 and status = 'pending' returning id`, [userId, now()]);
  if (rows.length) await audit(q, { userId, actor: 'user', type: 'vaultlock.recovery.cancelled', detail: { requestId: rows[0].id, via } });
  return rows.length > 0;
}
/** Any signed-in session may cancel: cancelling keeps protection in place, so it is the safe direction. */
export const cancelRecovery = (db: Db, s: Session) => db.tx((q) => cancelFor(q, s.userId, 'session'));
export const cancelRecoveryByToken = (db: Db, token: string) =>
  db.tx(async (q) => cancelFor(q, await consumeToken(q, token, 'recovery_cancel'), 'email_link'));

export const pendingRecovery = async (q: Q, userId: string) =>
  (await q.query(`select requested_at, effective_at, expires_at from recovery_requests where user_id = $1 and status = 'pending'`, [userId]))[0] ?? null;

/** Completes the release after the delay. The countdown and any open incident are NOT changed. */
export async function completeRecovery(db: Db, input: { email: string; password: string; recoveryKey: string }, meta: Meta) {
  const u = await authenticateRecovery(db, input, meta);
  return db.tx(async (q) => {
    const t = now();
    const [r] = await q.query(`select * from recovery_requests where user_id = $1 and status = 'pending' for update`, [u.id]);
    if (!r) throw new AppError('NOT_READY', 'There is no pending recovery request. Start one first.');
    if (new Date(r.expires_at) <= t) {
      await q.query(`update recovery_requests set status = 'expired' where id = $1`, [r.id]);
      return { expired: true as const };
    }
    if (new Date(r.effective_at) > t) throw new AppError('NOT_READY', `The waiting period ends at ${new Date(r.effective_at).toUTCString()}.`);
    await q.query(`update protection set vaultlock_active = false, sealed_policy_id = null, updated_at = $2 where user_id = $1`, [u.id, t]);
    await q.query(`update sealed_policies set status = 'released', released_at = $2 where id = $1`, [r.policy_id, t]);
    await q.query(`update recovery_requests set status = 'completed', completed_at = $2 where id = $1`, [r.id, t]);
    await q.query(`update sessions set revoked_at = $2 where user_id = $1 and revoked_at is null`, [u.id, t]);
    await audit(q, { userId: u.id, actor: 'user', type: 'vaultlock.released', detail: { requestId: r.id, policyId: r.policy_id, ip: meta.ip } });
    // Password + recovery key are two independent factors, so this session may enroll a new device.
    return { expired: false as const, token: await createSession(q, u.id, meta, { stepUp: true }) };
  }, 'recovery');
}
