/**
 * Per-test-file setup.
 * Runs before each test file (not before each individual test).
 * Ensures env vars are set for the test environment.
 */
import { afterAll } from 'vitest';

// Close DB pool and Redis after each test file to prevent open handles
afterAll(async () => {
  // Dynamically import to avoid module init before env vars are set
  const { pool } = await import('../src/config/database.js');
  const { redis } = await import('../src/config/redis.js');

  await pool.end().catch(() => {});
  await redis.quit().catch(() => {});
});
