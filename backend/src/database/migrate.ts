import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations(): Promise<Set<string>> {
  const result = await pool.query('SELECT name FROM migrations ORDER BY name');
  return new Set(result.rows.map((row: { name: string }) => row.name));
}

async function getMigrationFiles(): Promise<string[]> {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  files.sort();
  return files;
}

export async function runMigrations(closePool = true): Promise<void> {
  console.log('[Sahovat] Starting database migrations...');

  await ensureMigrationsTable();

  const executed = await getExecutedMigrations();
  const files = await getMigrationFiles();

  const pending = files.filter((f) => !executed.has(f));

  if (pending.length === 0) {
    console.log('[Sahovat] No pending migrations.');
    if (closePool) await pool.end();
    return;
  }

  console.log(`[Sahovat] Found ${pending.length} pending migration(s).`);

  const client = await pool.connect();

  try {
    for (const file of pending) {
      console.log(`[Sahovat] Running migration: ${file}`);

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

      await client.query('BEGIN');

      try {
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[Sahovat] Completed migration: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Sahovat] Failed migration: ${file}`);
        throw err;
      }
    }

    console.log('[Sahovat] All migrations completed successfully.');
  } finally {
    client.release();
    if (closePool) await pool.end();
  }
}

const isMainModule = process.argv[1]?.endsWith('migrate.js') || process.argv[1]?.endsWith('migrate.ts');

if (isMainModule) {
  runMigrations(true).catch((err) => {
    console.error('[Sahovat] Migration failed:', err);
    process.exit(1);
  });
}
