import type { Request, Response } from 'express';
import Redis from 'ioredis';
import { env } from '../../config/env.js';
import {
  DEMO_STREAM_CHANNEL,
  type DemoStreamPayload,
} from '../../services/notifications/demo-stream.js';
import { processRecurringDonations } from '../../services/scheduler.service.js';

/**
 * GET /api/dev/notifications-stream
 *
 * Server-Sent Events endpoint that streams redacted previews of every
 * mock SMS / Telegram / Email send to the Demo Notifications Console.
 *
 * Production safety:
 *   - Returns 404 when env.DEMO_CONSOLE_ENABLED is false.
 *   - Mounted only under /api/dev which is itself gated by the same flag
 *     in app.ts.
 *
 * Subscriber implementation: a dedicated ioredis client is created per
 * connection (subscriber clients can't issue regular commands). On
 * client disconnect we quit the subscriber promptly.
 */
export async function notificationsStream(
  req: Request,
  res: Response,
): Promise<void> {
  if (!env.DEMO_CONSOLE_ENABLED) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }

  // SSE response headers.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // Disable Nginx proxy buffering so events flush in real time.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Initial comment frame so the EventSource opens immediately
  // (some browsers wait for the first byte).
  res.write(': demo-notifications-stream open\n\n');

  // Heartbeat every 25s to defeat any 60s idle proxy timeout.
  const heartbeat = setInterval(() => {
    res.write(': hb\n\n');
  }, 25_000);

  // Dedicated subscriber connection.
  const subscriber = new Redis.default(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: false,
  });

  let closed = false;
  const cleanup = (): void => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    subscriber.quit().catch(() => {
      /* swallow close error */
    });
  };

  subscriber.on('message', (channel: string, message: string) => {
    if (channel !== DEMO_STREAM_CHANNEL) return;
    try {
      // Validate JSON shape minimally before forwarding.
      const parsed = JSON.parse(message) as DemoStreamPayload;
      if (!parsed.channel || !parsed.recipient || !parsed.timestamp) return;
      res.write(`event: notification\ndata: ${JSON.stringify(parsed)}\n\n`);
    } catch {
      // ignore malformed payloads
    }
  });

  subscriber.on('error', (err: Error) => {
    console.warn('[Sahovat] [dev-stream] subscriber error:', err.message);
  });

  try {
    await subscriber.subscribe(DEMO_STREAM_CHANNEL);
  } catch (err) {
    console.error('[Sahovat] [dev-stream] failed to subscribe:', err);
    cleanup();
    res.end();
    return;
  }

  req.on('close', () => {
    cleanup();
  });

  res.on('close', () => {
    cleanup();
  });
}

/**
 * POST /api/dev/trigger-recurring-cron
 *
 * Demo-only convenience: synchronously invokes the recurring-donation
 * scheduler so a presenter can show the charge → notification flow live
 * without waiting for the daily 06:00 UTC tick. Identical processing
 * path as the cron — just a different trigger.
 *
 * Gated identically to the SSE route: env flag + admin auth at the
 * router level.
 */
export async function triggerRecurringCron(
  _req: Request,
  res: Response,
): Promise<void> {
  if (!env.DEMO_CONSOLE_ENABLED) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }

  // Fire-and-await; the scheduler logs success/fail counts to stdout.
  await processRecurringDonations();
  res.status(200).json({ success: true });
}
