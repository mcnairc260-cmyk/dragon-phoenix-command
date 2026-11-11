import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { config, getScryptCost } from './config';

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

/** Separate keys per purpose, derived from the one server secret (never stored in the database). */
export const hmac = (purpose: string, data: string) => {
  const key = createHmac('sha256', config.secret).update(`lifeline:${purpose}`).digest();
  return createHmac('sha256', key).update(data).digest('hex');
};

export const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Deterministic JSON (sorted keys) so a hash of a policy is stable. */
export function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
}

const scryptAsync = (secret: string, salt: Buffer, N: number) =>
  new Promise<Buffer>((res, rej) =>
    scrypt(secret.normalize('NFKC'), salt, 32, { N, r: 8, p: 1, maxmem: 256 * N * 8 }, (e, k) => (e ? rej(e) : res(k))));

/** Memory-hard hash (scrypt, built into Node). Format: scrypt$N$salt$hash — versioned so it can migrate to Argon2id. */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const N = getScryptCost();
  const key = await scryptAsync(secret, salt, N);
  return `scrypt$${N}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifySecret(secret: string, stored: string | null | undefined): Promise<boolean> {
  // Always do the work, so a missing account or secret takes about as long as a wrong one.
  const [alg, n, salt, hash] = (stored ?? `scrypt$${getScryptCost()}$AAAAAAAAAAAAAAAAAAAAAA$`).split('$');
  if (alg !== 'scrypt') return false;
  const key = await scryptAsync(secret, Buffer.from(salt, 'base64url'), Number(n));
  const want = Buffer.from(hash ?? '', 'base64url');
  return !!stored && want.length === key.length && timingSafeEqual(want, key);
}
