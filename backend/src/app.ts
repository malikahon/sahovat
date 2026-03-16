import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { redis } from './config/redis.js';
import { storagePaths } from './config/storage.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { withdrawalAccountsRouter } from './modules/withdrawals/withdrawal-accounts.routes.js';
import { withdrawalsRouter } from './modules/withdrawals/withdrawals.routes.js';
import { campaignsRouter } from './modules/campaigns/campaigns.routes.js';
import { donationsRouter } from './modules/donations/donations.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { eventsRouter } from './modules/events/events.routes.js';
import { feedRouter } from './modules/feed/feed.routes.js';
import { recurringRouter } from './modules/recurring/recurring.routes.js';

export function createApp(): express.Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // General rate limiter
  app.use(generalLimiter);

  // Static file serving for public storage
  app.use('/storage', express.static(storagePaths.publicPath));

  // Health check — verifies DB + Redis connectivity
  app.get('/api/health', async (_req, res) => {
    const checks: Record<string, string> = {};
    let healthy = true;

    try {
      const dbResult = await pool.query('SELECT 1');
      checks.database = dbResult.rows.length > 0 ? 'ok' : 'error';
    } catch {
      checks.database = 'error';
      healthy = false;
    }

    try {
      const pong = await redis.ping();
      checks.redis = pong === 'PONG' ? 'ok' : 'error';
    } catch {
      checks.redis = 'error';
      healthy = false;
    }

    const status = healthy ? 'ok' : 'degraded';
    res.status(healthy ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/withdrawal-accounts', withdrawalAccountsRouter);
  app.use('/api/withdrawals', withdrawalsRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/donations', donationsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/feed', feedRouter);
  app.use('/api/recurring-donations', requireAuth, recurringRouter);
  app.use('/api/admin', requireAuth, requireAdmin, adminRouter);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
