import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { LIMITS, config, now } from './config';
import { audit } from './audit';
import { hashSecret, randomToken, sha256, verifySecret } from './crypto';
import type { Db, Q } from './db';
import { AppError } from './errors';
import { enqueue } from './notify/outbox';
import { clearRateLimit, rateLimit } from './ratelimit';
import { tpl } from './templates';

export interface Meta { ip?: string; userAgent?: string }
export interface Session {
  id: string; userId: string; pendingMfa: boolean; stepupAt: Date | null;
  email: string; name: string; emailVerified: boolean; plan: string; subStatus: string; hasPassphrase: boolean;
}

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(10, 'Use at least 10 characters.').max(200);
const addSeconds = (d: Date, s: number) => new Date(d.getTime() + s * 1000);

async function issueToken(q: Q, userId: string, kind: string, ttlSeconds: number) {
  const token = randomToken();
  const t = now();
  await q.query(`insert into auth_tokens (id, user_id, kind, token_hash, created_at, expires_at) values ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), userId, kind, sha256(token), t, addSeconds(t, ttlSeconds)]);
  return token;
}

/** Marks a single-use token as used and returns its user id. Fails if it was used, expired or unknown. */
export async function consumeToken(q: Q, token: string, kind: string): Promise<string> {
  const [row] = await q.query<{ user_id: string }>(
    `update auth_tokens set used_at = $3 where token_hash = $1 and kind = $2 and used_at is null and expires_at > $3 returning user_id`,
    [sha256(token), kind, now()]);
  if (!row) throw new AppError('BAD_REQUEST', 'This link is not valid any more. Request a new one.');
  return row.user_id;
}
export { issueToken };

export async function createSession(q: Q, userId: string, meta: Meta, opts: { pendingMfa?: boolean; stepUp?: boolean } = {}) {
  const token = randomToken();
  const t = now();
  const pending = !!opts.pendingMfa;
  await q.query(
    `insert into sessions (id, user_id, token_hash, pending_mfa, created_at, last_seen_at, idle_expires_at, expires_at, stepup_at, ip, user_agent)
     values ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10)`,
    [randomUUID(), userId, sha256(token), pending, t,
      addSeconds(t, pending ? LIMITS.pendingMfaSeconds : LIMITS.sessionIdleSeconds),
      addSeconds(t, pending ? LIMITS.pendingMfaSeconds : LIMITS.sessionAbsoluteSeconds),
      opts.stepUp ? t : null, meta.ip ?? null, (meta.userAgent ?? '').slice(0, 300)]);
  return token;
}

export async function register(db: Db, input: { email: string; password: string; name?: string }, meta: Meta) {
  const email = emailSchema.parse(input.email);
  const password = passwordSchema.parse(input.password);
  await rateLimit(db, `register:${meta.ip ?? 'unknown'}`, 10, 3600);
  const passwordHash = await hashSecret(password);
  return db.tx(async (q) => {
    const id = randomUUID();
    const t = now();
    const made = await q.query(
      `insert into users (id, email, name, password_hash, created_at) values ($1,$2,$3,$4,$5) on conflict do nothing returning id`,
      [id, email, (input.name ?? '').trim().slice(0, 80), passwordHash, t]);
    if (!made.length) throw new AppError('CONFLICT', 'An account with this email already exists. Sign in instead.');
    await q.query(`insert into protection (user_id, updated_at) values ($1,$2)`, [id, t]);
    const verify = await issueToken(q, id, 'verify_email', 86400);
    await enqueue(q, { userId: id, kind: 'verify_email', channel: 'email', recipient: email, ...tpl.verifyEmail(verify), dedupeKey: `verify:${id}:${sha256(verify).slice(0, 12)}` });
    await audit(q, { userId: id, actor: 'user', type: 'account.registered', detail: { ip: meta.ip } });
    return { userId: id, token: await createSession(q, id, meta) };
  });
}

export async function resendVerification(db: Db, s: Session) {
  if (s.emailVerified) return;
  await rateLimit(db, `verify:${s.userId}`, 5, 3600);
  await db.tx(async (q) => {
    const verify = await issueToken(q, s.userId, 'verify_email', 86400);
    await enqueue(q, { userId: s.userId, kind: 'verify_email', channel: 'email', recipient: s.email, ...tpl.verifyEmail(verify), dedupeKey: `verify:${s.userId}:${sha256(verify).slice(0, 12)}` });
  });
}

export const verifyEmail = (db: Db, token: string) =>
  db.tx(async (q) => {
    const userId = await consumeToken(q, token, 'verify_email');
    await q.query(`update users set email_verified_at = coalesce(email_verified_at, $2) where id = $1`, [userId, now()]);
    await audit(q, { userId, actor: 'user', type: 'account.email_verified' });
  });

export async function login(db: Db, input: { email: string; password: string }, meta: Meta) {
  const email = emailSchema.safeParse(input.email);
  const password = String(input.password ?? '');
  // Limits are counted outside the login transaction so that failed attempts are kept.
  await rateLimit(db, `login:ip:${meta.ip ?? 'unknown'}`, 30, 900);
  if (email.success) await rateLimit(db, `login:email:${email.data}`, 8, 900);
  const [user] = email.success ? await db.query(`select id, password_hash, email from users where lower(email) = $1`, [email.data]) : [];
  const ok = await verifySecret(password, user?.password_hash);
  if (!user || !ok) {
    if (user) await audit(db, { userId: user.id, actor: 'anonymous', type: 'auth.login.failed', detail: { ip: meta.ip } });
    throw new AppError('INVALID_CREDENTIALS', 'Email or password is not correct.');
  }
  return db.tx(async (q) => {
    const [{ n: passkeys }] = await q.query<{ n: number }>(`select count(*)::int n from webauthn_credentials where user_id = $1`, [user.id]);
    const [{ n: known }] = await q.query<{ n: number }>(`select count(*)::int n from sessions where user_id = $1 and user_agent = $2`, [user.id, (meta.userAgent ?? '').slice(0, 300)]);
    const [{ n: any }] = await q.query<{ n: number }>(`select count(*)::int n from sessions where user_id = $1`, [user.id]);
    const mfaRequired = passkeys > 0;
    const token = await createSession(q, user.id, meta, { pendingMfa: mfaRequired });
    if (any > 0 && known === 0) {
      await audit(q, { userId: user.id, actor: 'user', type: 'auth.login.new_device', detail: { ip: meta.ip, userAgent: meta.userAgent } });
      await enqueue(q, { userId: user.id, kind: 'security_notice', channel: 'email', recipient: user.email, ...tpl.newDevice(meta.userAgent ?? ''), dedupeKey: `newdev:${user.id}:${sha256(token).slice(0, 12)}` });
    }
    await audit(q, { userId: user.id, actor: 'user', type: mfaRequired ? 'auth.login.password_ok' : 'auth.login.success', detail: { ip: meta.ip } });
    return { token, mfaRequired };
  });
}

/** Completes a two-step sign-in after the passkey assertion was verified. */
export async function completeMfa(q: Q, s: Session) {
  const t = now();
  await q.query(`update sessions set pending_mfa = false, idle_expires_at = $2, expires_at = $3 where id = $1`,
    [s.id, addSeconds(t, LIMITS.sessionIdleSeconds), addSeconds(t, LIMITS.sessionAbsoluteSeconds)]);
  await audit(q, { userId: s.userId, actor: 'user', type: 'auth.login.success', detail: { mfa: 'passkey' } });
}

/** Resolves a session token. Expired (idle or absolute) and revoked sessions are rejected. Extends the idle timer. */
export async function getSession(db: Q, token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const t = now();
  const [r] = await db.query(
    `update sessions s set last_seen_at = $2,
        idle_expires_at = case when s.pending_mfa then s.idle_expires_at else least(s.expires_at, $3::timestamptz) end
       from users u
      where s.token_hash = $1 and u.id = s.user_id and s.revoked_at is null and s.idle_expires_at > $2 and s.expires_at > $2
      returning s.id, s.user_id, s.pending_mfa, s.stepup_at, u.email, u.name, u.email_verified_at, u.plan, u.sub_status, u.checkin_secret_hash is not null as has_passphrase`,
    [sha256(token), t, addSeconds(t, LIMITS.sessionIdleSeconds)]);
  if (!r) return null;
  return { id: r.id, userId: r.user_id, pendingMfa: r.pending_mfa, stepupAt: r.stepup_at, email: r.email, name: r.name,
    emailVerified: !!r.email_verified_at, plan: r.plan, subStatus: r.sub_status, hasPassphrase: r.has_passphrase };
}

export const logout = (db: Q, s: Session) => db.query(`update sessions set revoked_at = $2 where id = $1`, [s.id, now()]);

export async function requestPasswordReset(db: Db, rawEmail: string, meta: Meta) {
  await rateLimit(db, `reset:ip:${meta.ip ?? 'unknown'}`, 10, 3600);
  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) return; // same answer for every input: no account enumeration
  const [user] = await db.query(`select id, email from users where lower(email) = $1`, [email.data]);
  if (!user) return;
  await db.tx(async (q) => {
    const token = await issueToken(q, user.id, 'password_reset', 3600);
    await enqueue(q, { userId: user.id, kind: 'password_reset', channel: 'email', recipient: user.email, ...tpl.passwordReset(token), dedupeKey: `reset:${user.id}:${sha256(token).slice(0, 12)}` });
    await audit(q, { userId: user.id, actor: 'anonymous', type: 'auth.password_reset.requested', detail: { ip: meta.ip } });
  });
}

/**
 * Sets a new sign-in password. By design this changes NOTHING else: the
 * check-in passphrase, passkeys, Lifelines, schedule and VaultLock are untouched,
 * and a passkey is still needed to sign in when one is enrolled.
 */
export async function resetPassword(db: Db, token: string, newPassword: string) {
  const hash = await hashSecret(passwordSchema.parse(newPassword));
  await db.tx(async (q) => {
    const userId = await consumeToken(q, token, 'password_reset');
    await q.query(`update users set password_hash = $2 where id = $1`, [userId, hash]);
    await q.query(`update sessions set revoked_at = $2 where user_id = $1 and revoked_at is null`, [userId, now()]);
    await audit(q, { userId, actor: 'user', type: 'auth.password_reset.completed' });
  });
}

/** Sets the check-in passphrase. It must differ from the sign-in password. Sealed by VaultLock (database guard). */
export async function setPassphrase(db: Db, s: Session, passphrase: string, protectionStatus: string) {
  const p = z.string().min(8, 'Use at least 8 characters.').max(200).parse(passphrase);
  const [prot] = await db.query(`select vaultlock_active from protection where user_id = $1`, [s.userId]);
  if (prot.vaultlock_active) {
    await audit(db, { userId: s.userId, actor: 'user', type: 'vaultlock.blocked_attempt', detail: { action: 'passphrase.change' } });
    throw new AppError('VAULTLOCKED', 'Your check-in passphrase is sealed by VaultLock.');
  }
  if (protectionStatus !== 'setup') requireStepUp(s);
  const [u] = await db.query(`select password_hash from users where id = $1`, [s.userId]);
  if (await verifySecret(p, u.password_hash)) throw new AppError('BAD_REQUEST', 'Your check-in passphrase must be different from your sign-in password.');
  const hash = await hashSecret(p);
  await db.tx(async (q) => {
    await q.query(`update users set checkin_secret_hash = $2 where id = $1`, [s.userId, hash]);
    await audit(q, { userId: s.userId, actor: 'user', type: 'auth.passphrase.set' });
  });
}

export function requireStepUp(s: Session) {
  if (!s.stepupAt || now().getTime() - new Date(s.stepupAt).getTime() > LIMITS.stepUpSeconds * 1000) {
    throw new AppError('STEP_UP_REQUIRED', 'Confirm your identity to change this setting.');
  }
}

export async function verifyPassword(db: Db, s: Session, password: string) {
  await rateLimit(db, `pw:${s.userId}`, 8, 900);
  const [u] = await db.query(`select password_hash from users where id = $1`, [s.userId]);
  if (!(await verifySecret(String(password ?? ''), u.password_hash))) {
    await audit(db, { userId: s.userId, actor: 'user', type: 'auth.stepup.failed', detail: { factor: 'password' } });
    throw new AppError('VERIFICATION_FAILED', 'That password is not correct.');
  }
  await clearRateLimit(db, `pw:${s.userId}`);
}

export const markStepUp = async (q: Q, s: Session) => {
  await q.query(`update sessions set stepup_at = $2 where id = $1`, [s.id, now()]);
  await audit(q, { userId: s.userId, actor: 'user', type: 'auth.stepup.success' });
};

export const demoBanner = () => config.demoMode;
