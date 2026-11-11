import { randomUUID } from 'node:crypto';
import { now } from '../config';
import type { Q } from '../db';
import type { Channel } from './providers';

export interface Enqueue {
  userId: string;
  kind: string;
  channel: Channel;
  recipient: string;
  subject?: string;
  body: string;
  dedupeKey: string;
  incidentId?: string | null;
  contactId?: string | null;
  stage?: number | null;
  ackTokenHash?: string | null;
  /** 'suppressed' records a message that was deliberately not sent (for example: no consent). */
  status?: 'queued' | 'suppressed';
  reason?: string;
}

/** Adds a message to the outbox. The unique dedupe key makes this safe to repeat. Returns false if it already existed. */
export async function enqueue(q: Q, m: Enqueue): Promise<boolean> {
  const t = now();
  const rows = await q.query(
    `insert into notifications (id, user_id, incident_id, contact_id, kind, channel, recipient, subject, body, stage,
       status, next_attempt_at, dedupe_key, ack_token_hash, last_error, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     on conflict (dedupe_key) do nothing returning id`,
    [randomUUID(), m.userId, m.incidentId ?? null, m.contactId ?? null, m.kind, m.channel, m.recipient, m.subject ?? '',
      m.body, m.stage ?? null, m.status ?? 'queued', m.status === 'suppressed' ? null : t, m.dedupeKey,
      m.ackTokenHash ?? null, m.reason ?? null, t]);
  return rows.length > 0;
}
