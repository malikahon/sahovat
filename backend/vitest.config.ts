import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Run test files under tests/
    include: ['tests/**/*.test.ts'],
    // Global setup/teardown
    globalSetup: './tests/global-setup.ts',
    setupFiles: ['./tests/setup.ts'],
    // Env vars for test environment
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://sahovat:sahovat@localhost:5433/sahovat_test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'test-jwt-secret-min-32-characters-long!!',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-32-chars-long!!',
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      PORT: '3099',
      FRONTEND_URL: 'http://localhost:3000',
      OTP_TTL_SECONDS: '300',
      OTP_MAX_ATTEMPTS: '5',
      OTP_LOCKOUT_SECONDS: '900',
    },
    // Longer timeout for integration tests that hit DB/Redis
    testTimeout: 15000,
    hookTimeout: 30000,
    // Run serially by default to avoid DB conflicts between test files
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
