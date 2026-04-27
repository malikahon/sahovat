import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { notificationsStream, triggerRecurringCron } from './dev.controller.js';

/**
 * Dev routes — only mounted in app.ts when env.DEMO_CONSOLE_ENABLED.
 *
 * These endpoints expose dev/demo-only surfaces. Each route additionally
 * gates on admin auth so even with the env flag flipped on, only an
 * authenticated admin user can subscribe to the stream.
 */
export const devRouter = Router();

devRouter.get('/notifications-stream', requireAuth, requireAdmin, notificationsStream);
devRouter.post('/trigger-recurring-cron', requireAuth, requireAdmin, triggerRecurringCron);
