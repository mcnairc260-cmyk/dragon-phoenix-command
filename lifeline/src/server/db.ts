import { config } from './config';
import { SCHEMA_SQL } from './schema';

export interface Q {
  query<T = Record<string, any>>(sql: string, params?: unknown[]): Promise<T[]>;
}
export interface Db extends Q {
  /** Runs fn in one transaction. ctx sets the transaction-local `lifeline.ctx` guard setting. */
  tx<T>(fn: (q: Q) => Promise<T>, ctx?: 'recovery' | 'consent'): Promise<T>;
  close(): Promise<void>;
}

const withCtx = async <T>(q: Q, ctx: string | undefined, fn: (q: Q) => Promise<T>) => {
  if (ctx) await q.query(`select set_config('lifeline.ctx', $1, true)`, [ctx]);
  return fn(q);
};

async function pgDb(url: string): Promise<Db> {
  const { Pool, types } = await import('pg');
  types.setTypeParser(20, (v: string) => Number(v)); // bigint → number (counters only)
  const local = /localhost|127\.0\.0\.1|\/var\/run|host=\//.test(url);
  const pool = new Pool({ connectionString: url, max: 10, ssl: local ? undefined : { rejectUnauthorized: true } });
  pool.on('error', (e) => console.error('[lifeline] idle database connection error', e.message));
  const db: Db = {
    query: async (sql, params) => (await pool.query(sql, params as any[])).rows,
    async tx(fn, ctx) {
      const c = await pool.connect();
      try {
        await c.query('begin');
        const q: Q = { query: async (sql, params) => (await c.query(sql, params as any[])).rows };
        const out = await withCtx(q, ctx, fn);
        await c.query('commit');
        return out;
      } catch (e) {
        await c.query('rollback').catch(() => {});
        throw e;
      } finally {
        c.release();
      }
    },
    close: () => pool.end(),
  };
  const c = await pool.connect();
  try {
    await c.query('select pg_advisory_lock(7411)');
    await c.query(SCHEMA_SQL);
  } finally {
    await c.query('select pg_advisory_unlock(7411)').catch(() => {});
    c.release();
  }
  return db;
}

/** Embedded Postgres (PGlite): zero-setup local demo and tests. One connection, so transactions run one at a time. */
async function pgliteDb(dataDir: string | undefined): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  if (dataDir) (await import('node:fs')).mkdirSync(dataDir, { recursive: true });
  const pg = new PGlite(dataDir);
  await pg.exec(SCHEMA_SQL);
  return {
    query: async (sql, params) => (await pg.query(sql, params as any[])).rows as any[],
    tx: (fn, ctx) =>
      pg.transaction(async (t) =>
        withCtx({ query: async (sql, params) => (await t.query(sql, params as any[])).rows as any[] }, ctx, fn)) as Promise<any>,
    close: () => pg.close(),
  };
}

export async function openDb(url = config.databaseUrl): Promise<Db> {
  if (url === 'memory://') return pgliteDb(undefined);
  if (url) return pgDb(url);
  if (!config.demoMode) throw new Error('DATABASE_URL is required when demo mode is off');
  return pgliteDb(`${process.cwd()}/.data/pglite`);
}

const g = globalThis as unknown as { __lifelineDb?: Promise<Db> };
export const getDb = () => (g.__lifelineDb ??= openDb());
export const setDb = (db: Db | null) => {
  g.__lifelineDb = db ? Promise.resolve(db) : undefined;
};
