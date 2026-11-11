import { createHash, createSign, generateKeyPairSync, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { handleApi } from '@/server/api';
import { setClock, setScryptCost } from '@/server/config';
import { openDb, setDb, type Db } from '@/server/db';
import { tick } from '@/server/engine';
import { setProviders } from '@/server/notify/providers';

export const ORIGIN = 'http://localhost:3000';
export let db: Db;
let offsetMs = 0;
/** Moves the SERVER clock forward. Tests never pass a time to the API. */
export const travel = (seconds: number) => { offsetMs += seconds * 1000; };
export const HOUR = 3600, DAY = 86400;

/** Each test file gets its own database: embedded Postgres by default, or a fresh database on a real server when TEST_DATABASE_URL is set. */
export function testDb() {
  let admin: any, name = '';
  beforeAll(async () => {
    process.env.LIFELINE_DEMO_MODE = '1';
    delete process.env.APP_URL;
    setScryptCost(1024);
    const base = process.env.TEST_DATABASE_URL;
    if (base) {
      const { Client } = await import('pg');
      admin = new Client({ connectionString: base });
      await admin.connect();
      name = `ll_test_${randomBytes(6).toString('hex')}`;
      await admin.query(`create database ${name}`);
      const u = new URL(base);
      u.pathname = `/${name}`;
      db = await openDb(u.toString());
    } else db = await openDb('memory://');
    setDb(db);
  });
  beforeEach(() => {
    offsetMs = 0;
    setClock(() => new Date(Date.now() + offsetMs));
    setProviders(null);
  });
  afterAll(async () => {
    await db.close();
    if (admin) {
      await admin.query(`drop database if exists ${name} with (force)`);
      await admin.end();
    }
  });
}

export interface Res { status: number; data: any; cookie?: string }
export async function call(method: string, path: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}): Promise<Res> {
  const res = await handleApi(new Request(`${ORIGIN}/api${path}`, {
    method, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    headers: { origin: ORIGIN, host: 'localhost:3000', 'user-agent': 'vitest', ...(cookie ? { cookie } : {}), ...headers },
  }));
  return { status: res.status, data: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] };
}

export const rows = (sql: string, params: unknown[] = []) => db.query(sql, params);
export const one = async (sql: string, params: unknown[] = []) => (await rows(sql, params))[0];
export const events = async (userId: string, type?: string) =>
  rows(`select type, detail from audit_events where user_id = $1 ${type ? 'and type = $2' : ''} order by seq`, type ? [userId, type] : [userId]);

let seq = 0;
export interface TestUser { cookie: string; email: string; password: string; passphrase: string; userId: string }

export async function newUser(opts: { verify?: boolean; passphrase?: boolean } = {}): Promise<TestUser> {
  const email = `user${++seq}-${randomBytes(3).toString('hex')}@example.test`;
  const password = 'correct horse battery';
  const passphrase = 'purple-llama-42';
  const reg = await call('POST', '/auth/register', { email, password, name: `User ${seq}` }, undefined, { 'x-forwarded-for': `10.0.${seq % 250}.${Math.floor(Math.random() * 250)}` });
  if (reg.status !== 200) throw new Error(`register failed: ${JSON.stringify(reg.data)}`);
  const cookie = reg.cookie!;
  const { id: userId } = await one(`select id from users where email = $1`, [email]);
  if (opts.verify !== false) {
    const { body } = await one(`select body from notifications where user_id = $1 and kind = 'verify_email'`, [userId]);
    await call('POST', '/auth/verify-email', { token: body.match(/verify-email\/(\S+)/)[1] });
  }
  if (opts.passphrase !== false) await call('POST', '/auth/passphrase', { passphrase }, cookie);
  return { cookie, email, password, passphrase, userId };
}

export async function addLifeline(u: TestUser, input: Record<string, unknown> = {}, consent: boolean | 'none' = true) {
  const n = ++seq;
  const res = await call('POST', '/contacts', { name: `Contact ${n}`, email: `contact${n}@example.test`, channels: ['email'], ...input }, u.cookie);
  if (res.status !== 200) throw new Error(`addLifeline failed: ${JSON.stringify(res.data)}`);
  const token = await consentToken(res.data.id);
  if (consent === true) await call('POST', `/consent/${token}`, { decision: 'grant' });
  return { id: res.data.id as string, token };
}

export async function consentToken(contactId: string): Promise<string> {
  const { body } = await one(`select body from notifications where contact_id = $1 and kind = 'consent_request' order by created_at desc, id desc limit 1`, [contactId]);
  return body.match(/consent\/(\S+)/)[1];
}

/** A fully set-up, armed account with `lifelines` consenting contacts. */
export async function armed(lifelines = 1, settings?: Record<string, unknown>): Promise<TestUser & { contacts: { id: string; token: string }[] }> {
  const u = await newUser();
  if (lifelines > 2 || settings?.escalationMode === 'custom') await call('POST', '/billing/checkout', { plan: 'premium' }, u.cookie); // simulated in demo mode
  const contacts = [];
  for (let i = 0; i < lifelines; i++) contacts.push(await addLifeline(u, { stage: i + 1, priority: i + 1 }));
  if (settings) {
    const r = await call('PUT', '/protection/settings', settings, u.cookie);
    if (r.status !== 200) throw new Error(`settings failed: ${JSON.stringify(r.data)}`);
  }
  const r = await call('POST', '/protection/arm', {}, u.cookie);
  if (r.status !== 200) throw new Error(`arm failed: ${JSON.stringify(r.data)}`);
  return { ...u, contacts };
}

export const stepUp = (u: TestUser, extra: Record<string, unknown> = {}) =>
  call('POST', '/auth/stepup', { password: u.password, passphrase: u.passphrase, ...extra }, u.cookie);
export const checkIn = (u: TestUser, extra: Record<string, unknown> = {}) => call('POST', '/checkin', { passphrase: u.passphrase, ...extra }, u.cookie);
export const state = async (u: TestUser) => (await call('GET', '/me', undefined, u.cookie)).data;
export const alerts = (userId: string): Promise<any[]> =>
  rows(`select n.*, c.name as contact_name from notifications n left join contacts c on c.id = n.contact_id where n.user_id = $1 and n.kind = 'alert' order by n.created_at, n.id`, [userId]);
export const runTick = () => tick(db);
/** Runs the scheduler until nothing more happens (state change pass + send pass). */
export async function settle() {
  await tick(db);
  return tick(db);
}

export async function sealVault(u: TestUser): Promise<string> {
  await stepUp(u);
  const r = await call('POST', '/vaultlock/seal', { acknowledged: true }, u.cookie);
  if (r.status !== 200) throw new Error(`seal failed: ${JSON.stringify(r.data)}`);
  return r.data.recoveryKey;
}

// ------------------------------------------------------------ software WebAuthn authenticator (tests only)
const head = (major: number, n: number) =>
  n < 24 ? Buffer.from([(major << 5) | n]) : n < 256 ? Buffer.from([(major << 5) | 24, n]) : Buffer.from([(major << 5) | 25, n >> 8, n & 255]);
function cbor(v: unknown): Buffer {
  if (typeof v === 'number') return v >= 0 ? head(0, v) : head(1, -1 - v);
  if (Buffer.isBuffer(v)) return Buffer.concat([head(2, v.length), v]);
  if (typeof v === 'string') return Buffer.concat([head(3, Buffer.byteLength(v)), Buffer.from(v)]);
  if (v instanceof Map) return Buffer.concat([head(5, v.size), ...[...v].flatMap(([k, x]) => [cbor(k), cbor(x)])]);
  throw new Error('unsupported cbor value');
}
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest();

export function makeAuthenticator(origin = ORIGIN, rpId = 'localhost') {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  const credId = randomBytes(16);
  let counter = 0;
  const id = credId.toString('base64url');
  const clientData = (type: string, challenge: string) => Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  const authData = (attested: boolean, userVerified = true) => {
    const count = Buffer.alloc(4);
    count.writeUInt32BE(++counter);
    const flags = 0x01 | (userVerified ? 0x04 : 0) | (attested ? 0x40 : 0);
    const cose = cbor(new Map<number, unknown>([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x!, 'base64url')], [-3, Buffer.from(jwk.y!, 'base64url')]]));
    const len = Buffer.alloc(2);
    len.writeUInt16BE(credId.length);
    return Buffer.concat([sha(rpId), Buffer.from([flags]), count, ...(attested ? [Buffer.alloc(16), len, credId, cose] : [])]);
  };
  return {
    id,
    register(options: { challenge: string }) {
      const attestationObject = cbor(new Map<string, unknown>([['fmt', 'none'], ['attStmt', new Map()], ['authData', authData(true)]]));
      return { id, rawId: id, type: 'public-key', clientExtensionResults: {}, authenticatorAttachment: 'platform',
        response: { clientDataJSON: clientData('webauthn.create', options.challenge).toString('base64url'), attestationObject: attestationObject.toString('base64url'), transports: ['internal'] } };
    },
    assert(options: { challenge: string }, o: { userVerified?: boolean } = {}) {
      const cd = clientData('webauthn.get', options.challenge);
      const ad = authData(false, o.userVerified ?? true);
      const signature = createSign('SHA256').update(Buffer.concat([ad, sha(cd)])).sign(privateKey);
      return { id, rawId: id, type: 'public-key', clientExtensionResults: {},
        response: { clientDataJSON: cd.toString('base64url'), authenticatorData: ad.toString('base64url'), signature: signature.toString('base64url') } };
    },
  };
}

export async function enrollPasskey(u: TestUser) {
  const authn = makeAuthenticator();
  const { data } = await call('POST', '/passkeys/options', {}, u.cookie);
  const r = await call('POST', '/passkeys', { response: authn.register(data.options), label: 'Test device' }, u.cookie);
  if (r.status !== 200) throw new Error(`enroll failed: ${JSON.stringify(r.data)}`);
  return authn;
}
