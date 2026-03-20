// Validate environment variables first (fail fast)
import { env } from './config/env.js';
import { createApp } from './app.js';
import { pool } from './config/database.js';
import { redis } from './config/redis.js';
import { startScheduler, stopScheduler } from './services/scheduler.service.js';
import { warmUpOcr } from './services/ocr.service.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[Sahovat] Server running on port ${env.PORT}`);
  console.log(`[Sahovat] Environment: ${env.NODE_ENV}`);

  // Start cron scheduler for recurring donations
  startScheduler();

  // Pre-initialize Tesseract OCR worker in the background so the first
  // document upload isn't slow waiting for worker init + language data download.
  warmUpOcr();
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`[Sahovat] ${signal} received. Starting graceful shutdown...`);

  // Stop cron scheduler
  stopScheduler();

  server.close(async () => {
    console.log('[Sahovat] HTTP server closed');

    try {
      await pool.end();
      console.log('[Sahovat] Database pool closed');
    } catch (err) {
      console.error('[Sahovat] Error closing database pool:', err);
    }

    try {
      redis.disconnect();
      console.log('[Sahovat] Redis connection closed');
    } catch (err) {
      console.error('[Sahovat] Error closing Redis:', err);
    }

    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('[Sahovat] Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  // Log but do NOT shut down — some third-party libraries (e.g. Tesseract.js
  // worker threads) can emit unhandled rejections that are non-fatal.
  // Fatal application errors should throw synchronously or be handled explicitly.
  console.error('[Sahovat] Unhandled promise rejection (non-fatal):', reason);
});

process.on('uncaughtException', (err) => {
  // uncaughtException is genuinely fatal — the process state may be corrupt.
  console.error('[Sahovat] Uncaught exception:', err);
  shutdown('uncaughtException');
});
