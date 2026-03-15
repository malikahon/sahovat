import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Run tests in parallel
  fullyParallel: false,
  // Fail the build on CI if test.only is found
  forbidOnly: !!process.env['CI'],
  // Retry on CI
  retries: process.env['CI'] ? 2 : 0,
  // Single worker to avoid DB conflicts
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Fail fast on each step
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Start backend + frontend before running tests
  webServer: [
    {
      command: 'NODE_ENV=test npm run dev:backend',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://sahovat:sahovat@localhost:5433/sahovat_test',
        PORT: '3001',
      },
    },
    {
      command: 'npm run dev:frontend',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
        NEXT_PUBLIC_API_URL: 'http://localhost:3001/api',
      },
    },
  ],
});
