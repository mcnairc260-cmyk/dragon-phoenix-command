import { randomUUID } from 'node:crypto';
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { LIMITS, config, now } from './config';
import { audit } from './audit';
import { requireStepUp, type Session } from './auth';
import type { Db, Q } from './db';
import { AppError, fromDbError } from './errors';
import { clearRateLimit, rateLimit } from './ratelimit';
import { verifySecret } from './crypto';

export type Purpose = 'register' | 'login' | 'checkin' | 'stepup';
const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64url');

async function saveChallenge(q: Q, s: Session, purpose: Purpose, challenge: string) {
  const t = now();
  await q.query(
    `insert into webauthn_challenges (id, user_id, session_id, purpose, challenge, created_at, expires_at) values ($1,$2,$3,$4,$5,$6,$7)`,
    [randomUUID(), s.userId, s.id, purpose, challenge, t, new Date(t.getTime() + LIMITS.challengeSeconds * 1000)]);
}

/**
 * Replay protection: a challenge is bound to one session and one purpose and is
 * marked as used BEFORE the signature is checked, so it can never be used twice.
 */
async function takeChallenge(q: Q, s: Session, purpose: Purpose, response: any): Promise<string> {
  let challenge = '';
  try {
    challenge = JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64url').toString()).challenge;
  } catch {
    throw new AppError('VERIFICATION_FAILED', 'Device verification failed.');
  }
  const [row] = await q.query(
    `update webauthn_challenges set used_at = $4 where session_id = $1 and purpose = $2 and challenge = $3
       and used_at is null and expires_at > $4 returning id`, [s.id, purpose, challenge, now()]);
  if (!row) throw new AppError('VERIFICATION_FAILED', 'Device verification expired or was already used. Try again.');
  return challenge;
}

export const listPasskeys = (q: Q, userId: string) =>
  q.query(`select id, label, created_at, last_used_at from webauthn_credentials where user_id = $1 order by created_at`, [userId]);

export async function registrationOptions(db: Db, s: Session) {
  const existing = await db.query(`select credential_id, transports from webauthn_credentials where user_id = $1`, [s.userId]);
  const options = await generateRegistrationOptions({
    rpName: 'Lifeline', rpID: config.rpId, userName: s.email, userDisplayName: s.name || s.email,
    userID: new TextEncoder().encode(s.userId), attestationType: 'none',
    excludeCredentials: existing.map((c) => ({ id: c.credential_id, transports: c.transports ? JSON.parse(c.transports) : undefined })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
  });
  await saveChallenge(db, s, 'register', options.challenge);
  return options;
}

/** Enrolls a device. Needs recent identity confirmation once protection is armed; blocked by the database while VaultLock is active. */
export async function verifyRegistration(db: Db, s: Session, response: any, label: string, protectionStatus: string) {
  if (protectionStatus !== 'setup') requireStepUp(s);
  const expectedChallenge = await takeChallenge(db, s, 'register', response);
  const v = await verifyRegistrationResponse({
    response, expectedChallenge, expectedOrigin: config.appUrl, expectedRPID: config.rpId, requireUserVerification: true,
  }).catch(() => null);
  if (!v?.verified || !v.registrationInfo) throw new AppError('VERIFICATION_FAILED', 'This device could not be enrolled.');
  const c = v.registrationInfo.credential;
  try {
    await db.tx(async (q) => {
      await q.query(
        `insert into webauthn_credentials (id, user_id, credential_id, public_key, counter, transports, label, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [randomUUID(), s.userId, c.id, b64(c.publicKey), c.counter, JSON.stringify(response.response?.transports ?? []), (label || 'Passkey').slice(0, 60), now()]);
      await audit(q, { userId: s.userId, actor: 'user', type: 'auth.passkey.enrolled', detail: { label } });
    });
  } catch (e) {
    const mapped = fromDbError(e);
    if (mapped) await audit(db, { userId: s.userId, actor: 'user', type: 'vaultlock.blocked_attempt', detail: { action: 'passkey.enroll' } });
    throw mapped ?? e;
  }
}

export async function removePasskey(db: Db, s: Session, id: string) {
  requireStepUp(s);
  try {
    await db.tx(async (q) => {
      const rows = await q.query(`delete from webauthn_credentials where id = $1 and user_id = $2 returning id`, [id, s.userId]);
      if (!rows.length) throw new AppError('NOT_FOUND', 'Passkey not found.');
      await audit(q, { userId: s.userId, actor: 'user', type: 'auth.passkey.removed', detail: { id } });
    });
  } catch (e) {
    const mapped = fromDbError(e);
    if (mapped) await audit(db, { userId: s.userId, actor: 'user', type: 'vaultlock.blocked_attempt', detail: { action: 'passkey.remove' } });
    throw mapped ?? e;
  }
}

export async function assertionOptions(db: Db, s: Session, purpose: Purpose) {
  const creds = await db.query(`select credential_id, transports from webauthn_credentials where user_id = $1`, [s.userId]);
  if (!creds.length) return null;
  const options = await generateAuthenticationOptions({
    rpID: config.rpId, userVerification: 'required',
    allowCredentials: creds.map((c) => ({ id: c.credential_id, transports: c.transports ? JSON.parse(c.transports) : undefined })),
  });
  await saveChallenge(db, s, purpose, options.challenge);
  return options;
}

export async function verifyAssertion(db: Db, s: Session, purpose: Purpose, response: any) {
  if (!response?.id) throw new AppError('VERIFICATION_FAILED', 'Device verification is required.');
  const expectedChallenge = await takeChallenge(db, s, purpose, response);
  const [cred] = await db.query(`select * from webauthn_credentials where credential_id = $1 and user_id = $2`, [response.id, s.userId]);
  if (!cred) throw new AppError('VERIFICATION_FAILED', 'Device verification failed.');
  const v = await verifyAuthenticationResponse({
    response, expectedChallenge, expectedOrigin: config.appUrl, expectedRPID: config.rpId, requireUserVerification: true,
    credential: { id: cred.credential_id, publicKey: new Uint8Array(Buffer.from(cred.public_key, 'base64url')), counter: Number(cred.counter) },
  }).catch(() => null);
  if (!v?.verified) throw new AppError('VERIFICATION_FAILED', 'Device verification failed.');
  await db.query(`update webauthn_credentials set counter = $2, last_used_at = $3 where id = $1`, [cred.id, v.authenticationInfo.newCounter, now()]);
}

export interface Proof { passphrase?: string; assertion?: unknown }

/**
 * The identity check used for a check-in and for sensitive changes:
 * the secret passphrase AND a passkey ceremony with user verification.
 * Without an enrolled passkey this passes only in demo mode, and is recorded as "simulated".
 */
export async function verifyPresence(db: Db, s: Session, proof: Proof, purpose: 'checkin' | 'stepup'): Promise<'passkey' | 'simulated'> {
  const key = `presence:${s.userId}`;
  await rateLimit(db, key, 6, 900);
  const fail = async (factor: string, message: string): Promise<never> => {
    await audit(db, { userId: s.userId, actor: 'user', type: 'auth.presence.failed', detail: { purpose, factor } });
    throw new AppError('VERIFICATION_FAILED', message);
  };
  const [u] = await db.query(`select checkin_secret_hash from users where id = $1`, [s.userId]);
  if (!u.checkin_secret_hash) throw new AppError('NOT_READY', 'Set your check-in passphrase first.');
  if (!(await verifySecret(String(proof.passphrase ?? ''), u.checkin_secret_hash))) await fail('passphrase', 'That passphrase is not correct.');
  const [{ n }] = await db.query<{ n: number }>(`select count(*)::int n from webauthn_credentials where user_id = $1`, [s.userId]);
  let device: 'passkey' | 'simulated' = 'simulated';
  if (n > 0) {
    try {
      await verifyAssertion(db, s, purpose, proof.assertion);
    } catch (e) {
      if (e instanceof AppError && e.code === 'VERIFICATION_FAILED') await fail('passkey', e.message);
      throw e;
    }
    device = 'passkey';
  } else if (!config.demoMode) {
    throw new AppError('NOT_READY', 'Enroll a passkey on this device first.');
  }
  await clearRateLimit(db, key);
  return device;
}
