import { now } from './config';
import { AppError } from './errors';
import type { Q } from './db';

/** Fixed-window counter stored in the database (works across serverless instances). */
export async function rateLimit(q: Q, key: string, max: number, windowSeconds: number): Promise<void> {
  const t = now().getTime();
  const start = new Date(t - (t % (windowSeconds * 1000)));
  const [row] = await q.query<{ count: number }>(
    `insert into rate_limits (key, window_start, count) values ($1,$2,1)
     on conflict (key, window_start) do update set count = rate_limits.count + 1 returning count`, [key, start]);
  if (row.count > max) throw new AppError('RATE_LIMITED', 'Too many attempts. Wait a few minutes, then try again.');
}

export const clearRateLimit = (q: Q, key: string) => q.query(`delete from rate_limits where key = $1`, [key]);
