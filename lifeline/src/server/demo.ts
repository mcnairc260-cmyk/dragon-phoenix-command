import { config, now } from './config';
import { audit } from './audit';
import type { Session } from './auth';
import type { Db } from './db';
import { tick } from './engine';
import { AppError } from './errors';

export type Jump = 'reminder' | 'deadline' | 'grace' | 'stage' | 'recovery';

/**
 * Demonstration only: moves THIS account's timers into the past so the founder
 * can watch a missed check-in without waiting days. The engine itself is not
 * bypassed — after the shift the normal scheduler pass runs. Refused when demo mode is off.
 */
export async function timeTravel(db: Db, s: Session, jump: Jump) {
  if (!config.demoMode) throw new AppError('DEMO_ONLY', 'Only available in demonstration mode.');
  const t = now().getTime();
  const [p] = await db.query(`select * from protection where user_id = $1`, [s.userId]);
  const [inc] = await db.query(`select next_stage_at from incidents where user_id = $1 and status = 'open'`, [s.userId]);
  const [rec] = await db.query(`select effective_at from recovery_requests where user_id = $1 and status = 'pending'`, [s.userId]);
  const deadline = p.deadline_at ? new Date(p.deadline_at).getTime() : null;
  let target: number | null = null;
  if (jump === 'reminder' && deadline) target = deadline - Math.max(...(p.reminder_offsets as number[]), 0);
  if (jump === 'deadline' && deadline) target = deadline;
  if (jump === 'grace' && deadline) target = deadline + p.grace_seconds * 1000;
  if (jump === 'stage' && inc?.next_stage_at) target = new Date(inc.next_stage_at).getTime();
  if (jump === 'recovery' && rec) target = new Date(rec.effective_at).getTime();
  if (target === null) throw new AppError('NOT_READY', 'Nothing to fast-forward to right now.');
  const shift = Math.max(0, Math.ceil((target - t) / 1000) + 1);
  await db.tx(async (q) => {
    const by = [s.userId, shift];
    await q.query(`update protection set deadline_at = deadline_at - ($2 * interval '1 second'), last_checkin_at = last_checkin_at - ($2 * interval '1 second') where user_id = $1`, by);
    await q.query(`update incidents set next_stage_at = next_stage_at - ($2 * interval '1 second') where user_id = $1 and status = 'open'`, by);
    await q.query(`update recovery_requests set effective_at = effective_at - ($2 * interval '1 second') where user_id = $1 and status = 'pending'`, by);
    await audit(q, { userId: s.userId, actor: 'demo', type: 'demo.time_travel', detail: { jump, shiftSeconds: shift } });
  });
  // Two passes: the first changes state, the second sends what the first queued.
  await tick(db);
  return { shiftSeconds: shift, report: await tick(db) };
}
