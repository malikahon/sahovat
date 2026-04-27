import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import { env } from '../../config/env.js';
import * as telegramModuleService from './telegram.service.js';

/**
 * POST /api/telegram/webhook
 *
 * Telegram bot update receiver. Verifies the secret-token header that
 * Telegram includes when the webhook was registered with `secret_token`.
 *
 * We always respond 200 even on errors — Telegram retries non-2xx
 * indefinitely, which would amplify any transient failure into a
 * notification storm. Errors are logged server-side instead.
 */
export async function telegramWebhook(req: Request, res: Response): Promise<void> {
  // Verify shared secret. Empty configured secret = open endpoint (dev/test only).
  if (env.TELEGRAM_WEBHOOK_SECRET) {
    const provided = req.header('x-telegram-bot-api-secret-token') ?? '';
    if (provided !== env.TELEGRAM_WEBHOOK_SECRET) {
      // Don't 401 — Telegram would retry. Just silently 200.
      console.warn('[Sahovat] Telegram webhook rejected: bad secret token');
      res.status(200).json({ ok: true });
      return;
    }
  }

  try {
    const update = req.body as Parameters<typeof telegramModuleService.handleTelegramWebhook>[0];
    const result = await telegramModuleService.handleTelegramWebhook(update);
    if (result.handled) {
      console.log(`[Sahovat] Telegram webhook handled: action=${result.action}`);
    }
  } catch (err) {
    console.error('[Sahovat] Telegram webhook handler threw:', err);
  }

  res.status(200).json({ ok: true });
}

/**
 * POST /api/users/me/telegram/start-linking
 * Authenticated. Returns a one-time `t.me/<bot>?start=<code>` URL.
 */
export async function startLinking(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const result = await telegramModuleService.startTelegramLinking(authReq.user.id);
  res.status(200).json({
    success: true,
    data: result,
  });
}
