import pg from 'pg';
import { env } from './env.js';

const { Pool, types } = pg;

// Parse BIGINT (OID 20) as JavaScript number instead of string.
// Safe for values up to Number.MAX_SAFE_INTEGER (9,007,199,254,740,991 ~= 9 quadrillion UZS).
types.setTypeParser(20, (val: string) => {
  const num = Number(val);
  if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
    console.warn(`[Sahovat] BIGINT value ${val} exceeds safe integer range`);
  }
  return num;
});

// Parse NUMERIC/DECIMAL (OID 1700) as JavaScript number instead of string.
types.setTypeParser(1700, (val: string) => parseFloat(val));

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[Sahovat] Unexpected database pool error:', err.message);
});

export async function query(text: string, params?: unknown[]): Promise<pg.QueryResult> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (env.NODE_ENV === 'development') {
    console.log('[Sahovat] Query executed', {
      text: text.substring(0, 200),
      duration: `${duration}ms`,
      rows: result.rowCount,
    });
  }

  return result;
}

export async function getClient(): Promise<pg.PoolClient> {
  const client = await pool.connect();
  return client;
}
