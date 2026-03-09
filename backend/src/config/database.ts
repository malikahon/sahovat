import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

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
