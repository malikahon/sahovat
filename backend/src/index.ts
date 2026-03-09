// Validate environment variables first (fail fast)
import { env } from './config/env.js';
import { createApp } from './app.js';
import { pool } from './config/database.js';
import { redis } from './config/redis.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[Sahovat] Server running on port ${env.PORT}`);
  console.log(`[Sahovat] Environment: ${env.NODE_ENV}`);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`[Sahovat] ${signal} received. Starting graceful shutdown...`);

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
