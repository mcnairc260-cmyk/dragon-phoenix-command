import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { now } from './config';
import { audit } from './audit';
import { emailSchema, requireStepUp, type Meta, type Session } from './auth';
import { planFor } from './billing';
import { randomToken, sha256 } from './crypto';
import type { Db, Q } from './db';
import { AppError, fromDbError } from './errors';
import { enqueue } from './notify/outbox';
import { tpl } from './templates';

export const CONSENT_TEXT_VERSION = '2026-11-v1';

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(80),
  relationship: z.string().trim().max(60).default(''),
  email: emailSchema,
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Use international format, for example +12055550123.').nullish().or(z.literal('').transform(() => null)),
  channels: z.array(z.enum(['email', 'sms', 'voice'])).min(1).default(['email']),
  stage: z.number().int().min(1).max(10).default(1),
  priority: z.number().int().min(1).max(99).default(1),
  message: z.string().trim().max(500).default(''),
});
export type ContactInput = z.input<typeof contactSchema>;

const PUBLIC = `id, name, relationship, email, phone, channels, stage, priority, message, consent_status, consent_channels, consent_at, created_at`;
export const listContacts = (q: Q, userId: string) =>
  q.query(`select ${PUBLIC} from contacts where user_id = $1 and removed_at is null order by stage, priority, created_at`, [userId]);

async function guard<T>(db: Db, s: Session, action: string, fn: () => Promise<T>): Promise<T> {
  const [p] = await db.query(`select status, vaultlock_active from protection where user_id = $1`, [s.userId]);
  if (p.vaultlock_active) {
    await audit(db, { userId: s.userId, actor: 'user', type: 'vaultlock.blocked_attempt', detail: { action } });
    throw new AppError('VAULTLOCKED', 'Your Lifelines are sealed by VaultLock. They cannot be changed from a normal session.');
  }
  if (p.status !== 'setup') requireStepUp(s);
  try {
    return await fn();
  } catch (e) {
    // The database guard is the second line: it also stops a change that raced with sealing.
    const mapped = fromDbError(e);
    if (mapped?.code === 'VAULTLOCKED') await audit(db, { userId: s.userId, actor: 'user', type: 'vaultlock.blocked_attempt', detail: { action, layer: 'database' } });
    throw mapped ?? e;
  }
}

function checkPlan(s: Session, c: z.output<typeof contactSchema>) {
  const plan = planFor(s.plan);
  const bad = c.channels.filter((ch) => !plan.channels.includes(ch));
  if (bad.length) throw new AppError('PLAN_LIMIT', `${bad.join(' and ')} notifications need the Premium plan.`);
  if (c.channels.some((ch) => ch !== 'email') && !c.phone) throw new AppError('BAD_REQUEST', 'Add a phone number for text or call notifications.');
}

async function sendConsentRequest(q: Q, s: Session, contactId: string, c: { name: string; email: string; channels: string[] }) {
  const token = randomToken();
  await q.query(`update contacts set consent_token_hash = $2, consent_status = 'pending', consent_channels = '[]', consent_at = null where id = $1`, [contactId, sha256(token)]);
  await enqueue(q, { userId: s.userId, contactId, kind: 'consent_request', channel: 'email', recipient: c.email,
    ...tpl.consentRequest(s.name || s.email, c.name, c.channels, token), dedupeKey: `consent:${contactId}:${sha256(token).slice(0, 12)}` });
}

export const addContact = (db: Db, s: Session, input: ContactInput) =>
  guard(db, s, 'lifeline.add', async () => {
    const c = contactSchema.parse(input);
    checkPlan(s, c);
    return db.tx(async (q) => {
      const [{ n }] = await q.query<{ n: number }>(`select count(*)::int n from contacts where user_id = $1 and removed_at is null`, [s.userId]);
      const plan = planFor(s.plan);
      if (n >= plan.maxContacts) throw new AppError('PLAN_LIMIT', `Your ${plan.name} plan allows ${plan.maxContacts} Lifelines.`);
      const id = randomUUID();
      await q.query(
        `insert into contacts (id, user_id, name, relationship, email, phone, channels, stage, priority, message, created_at)
         values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)`,
        [id, s.userId, c.name, c.relationship, c.email, c.phone ?? null, JSON.stringify(c.channels), c.stage, c.priority, c.message, now()]);
      await sendConsentRequest(q, s, id, c);
      await audit(q, { userId: s.userId, actor: 'user', type: 'lifeline.added', detail: { id, channels: c.channels } });
      return id;
    });
  });

export const updateContact = (db: Db, s: Session, id: string, input: ContactInput) =>
  guard(db, s, 'lifeline.update', async () => {
    const c = contactSchema.parse(input);
    checkPlan(s, c);
    return db.tx(async (q) => {
      const [old] = await q.query(`select * from contacts where id = $1 and user_id = $2 and removed_at is null for update`, [id, s.userId]);
      if (!old) throw new AppError('NOT_FOUND', 'Lifeline not found.');
      await q.query(
        `update contacts set name=$2, relationship=$3, email=$4, phone=$5, channels=$6::jsonb, stage=$7, priority=$8, message=$9 where id=$1`,
        [id, c.name, c.relationship, c.email, c.phone ?? null, JSON.stringify(c.channels), c.stage, c.priority, c.message]);
      // A new address or channel must be consented to again, so an edit cannot redirect alerts to someone who never agreed.
      const reconsent = old.email !== c.email || (old.phone ?? null) !== (c.phone ?? null) || JSON.stringify(old.channels) !== JSON.stringify(c.channels);
      if (reconsent) await sendConsentRequest(q, s, id, c);
      await audit(q, { userId: s.userId, actor: 'user', type: 'lifeline.updated', detail: { id, reconsent } });
    });
  });

export const removeContact = (db: Db, s: Session, id: string) =>
  guard(db, s, 'lifeline.remove', () =>
    db.tx(async (q) => {
      const rows = await q.query(`update contacts set removed_at = $3 where id = $1 and user_id = $2 and removed_at is null returning id`, [id, s.userId, now()]);
      if (!rows.length) throw new AppError('NOT_FOUND', 'Lifeline not found.');
      await audit(q, { userId: s.userId, actor: 'user', type: 'lifeline.removed', detail: { id } });
    }));

// ------------------------------------------------- the Lifeline's own consent page (no account needed)

export async function consentInfo(db: Db, token: string) {
  const [c] = await db.query(
    `select c.name, c.channels, c.consent_status, c.consent_channels, c.removed_at, u.name as user_name
       from contacts c join users u on u.id = c.user_id where c.consent_token_hash = $1`, [sha256(token)]);
  if (!c || c.removed_at) throw new AppError('NOT_FOUND', 'This link is not valid.');
  return { name: c.name, requestedBy: c.user_name || 'A Lifeline member', channels: c.channels, status: c.consent_status, consentChannels: c.consent_channels, textVersion: CONSENT_TEXT_VERSION };
}

/**
 * Records a Lifeline's decision. This is the one change to a sealed contact that
 * VaultLock allows, and it can only touch the consent fields (database guard, ctx 'consent').
 * Opt-out always works; it can never redirect a notification.
 */
export async function decideConsent(db: Db, token: string, decision: 'grant' | 'decline' | 'revoke', channels: string[] | undefined, meta: Meta) {
  return db.tx(async (q) => {
    const [c] = await q.query(`select * from contacts where consent_token_hash = $1 and removed_at is null for update`, [sha256(token)]);
    if (!c) throw new AppError('NOT_FOUND', 'This link is not valid.');
    const requested: string[] = c.channels;
    const granted = decision === 'grant' ? requested.filter((ch) => !channels || channels.includes(ch)) : [];
    if (decision === 'grant' && !granted.length) throw new AppError('BAD_REQUEST', 'Choose at least one way to be notified.');
    const status = decision === 'grant' ? 'granted' : decision === 'decline' ? 'declined' : 'revoked';
    const evidence = { at: now().toISOString(), ip: meta.ip, userAgent: meta.userAgent, textVersion: CONSENT_TEXT_VERSION, decision, channels: granted };
    await q.query(`update contacts set consent_status = $2, consent_channels = $3::jsonb, consent_at = $4, consent_evidence = $5::jsonb where id = $1`,
      [c.id, status, JSON.stringify(granted), now(), JSON.stringify(evidence)]);
    await audit(q, { userId: c.user_id, actor: 'lifeline', type: `lifeline.consent.${status}`, detail: { contactId: c.id, channels: granted, ip: meta.ip } });
    return { status, channels: granted };
  }, 'consent');
}
