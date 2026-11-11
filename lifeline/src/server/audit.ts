import { canonical, hmac } from './crypto';
import { now } from './config';
import type { Q } from './db';

export interface AuditInput {
  userId?: string | null;
  actor: string; // 'user', 'system', 'lifeline', 'anonymous', 'demo'
  type: string;
  detail?: Record<string, unknown>;
}

const link = (prev: string, chain: string, e: { actor: string; type: string; detail: string; at: string }) =>
  hmac('audit', [prev, chain, e.actor, e.type, e.detail, e.at].join('\n'));

/**
 * Appends one event to a per-user hash chain. Each record carries an HMAC over
 * its content and the previous record's hash, keyed by a server secret that is
 * not in the database. Changing or removing a record breaks verification.
 * Never put secrets in `detail`.
 */
export async function audit(q: Q, e: AuditInput): Promise<void> {
  const chain = e.userId ?? 'system';
  const at = now();
  const detail = canonical(e.detail ?? {});
  // The upsert takes a row lock on the chain head, so appends to one chain are serialised.
  const [head] = await q.query<{ hash: string }>(
    `insert into audit_heads (chain, hash, count) values ($1, 'genesis', 0)
     on conflict (chain) do update set count = audit_heads.count returning hash`, [chain]);
  const hash = link(head.hash, chain, { actor: e.actor, type: e.type, detail, at: at.toISOString() });
  await q.query(
    `insert into audit_events (chain, user_id, actor, type, detail, created_at, prev_hash, hash)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [chain, e.userId ?? null, e.actor, e.type, detail, at, head.hash, hash]);
  await q.query(`update audit_heads set hash = $2, count = count + 1 where chain = $1`, [chain, hash]);
}

export interface ChainCheck { ok: boolean; count: number; brokenAtSeq?: number; reason?: string }

/** Recomputes a chain from the first record. Detects edited, removed, reordered or inserted records. */
export async function verifyChain(q: Q, chain: string): Promise<ChainCheck> {
  const rows = await q.query(
    `select seq, actor, type, detail, created_at, prev_hash, hash from audit_events where chain = $1 order by seq`, [chain]);
  let prev = 'genesis';
  for (const r of rows) {
    const want = link(prev, chain, { actor: r.actor, type: r.type, detail: r.detail, at: new Date(r.created_at).toISOString() });
    if (r.prev_hash !== prev || r.hash !== want) return { ok: false, count: rows.length, brokenAtSeq: Number(r.seq), reason: 'record does not match chain' };
    prev = r.hash;
  }
  const [head] = await q.query(`select hash, count from audit_heads where chain = $1`, [chain]);
  if (!head) return rows.length === 0 ? { ok: true, count: 0 } : { ok: false, count: rows.length, reason: 'chain head missing' };
  if (head.hash !== prev || Number(head.count) !== rows.length) return { ok: false, count: rows.length, reason: 'records missing from end of chain' };
  return { ok: true, count: rows.length };
}
