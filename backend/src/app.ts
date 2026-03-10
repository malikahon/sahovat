import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { storagePaths } from './config/storage.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { withdrawalAccountsRouter } from './modules/withdrawals/withdrawal-accounts.routes.js';

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

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/withdrawal-accounts', withdrawalAccountsRouter);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
