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
    // Pass the full test env explicitly. vitest.config.ts's `test.env`
    // only injects into test workers — globalSetup spawns its own
    // child via execSync and that child does NOT inherit those values.
    // Mirror vitest.config.ts's `test.env` block so env.ts validation
    // passes inside the spawned migrate.ts regardless of what the host
    // shell (dev machine or CI runner) has exported.
    execSync(`npx tsx "${MIGRATE_SCRIPT}"`, {
      cwd: BACKEND_DIR,
      stdio: 'pipe',
      encoding: 'utf-8',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: TEST_DATABASE_URL,
        REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
        JWT_SECRET: 'test-jwt-secret-min-32-characters-long!!',
        JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-32-chars-long!!',
        ENCRYPTION_KEY:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        SMS_API_URL: 'https://notify.eskiz.uz',
        SMS_API_EMAIL: 'test@eskiz.test',
        SMS_API_PASSWORD: 'test-password',
        SMS_ESKIZ_TEST_MODE: 'true',
      },
    });
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
