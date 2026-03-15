/**
 * Global setup — runs once before all test suites.
 * Runs database migrations on the test database by spawning the migrate.ts
 * script with DATABASE_URL pointed at the test DB.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DATABASE_URL = 'postgresql://sahovat:sahovat@localhost:5433/sahovat_test';
const MIGRATE_SCRIPT = path.join(__dirname, '../src/database/migrate.ts');
const BACKEND_DIR = path.join(__dirname, '..');

export async function setup() {
  try {
    execSync(
      `DATABASE_URL="${TEST_DATABASE_URL}" NODE_ENV=test npx tsx "${MIGRATE_SCRIPT}"`,
      {
        cwd: BACKEND_DIR,
        stdio: 'pipe',
        encoding: 'utf-8',
      },
    );
    console.log('[Test Setup] Migrations applied to test DB.');
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string };
    // Ignore "No pending migrations" — that's fine
    const output = (error.stdout ?? '') + (error.stderr ?? '');
    if (!output.includes('No pending migrations') && !output.includes('already')) {
      console.error('[Test Setup] Migration error:', output);
      throw err;
    }
    console.log('[Test Setup] Migrations already applied (or no pending).');
  }
}

export async function teardown() {
  // Nothing needed — connections are managed per-test-file
}
