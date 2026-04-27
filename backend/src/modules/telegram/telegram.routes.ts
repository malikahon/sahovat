import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as telegramController from './telegram.controller.js';

export const telegramRouter = Router();

/**
 * Public webhook endpoint hit by Telegram's servers.
 * Authenticated via X-Telegram-Bot-Api-Secret-Token header (configured
 * when registering the webhook with @BotFather).
 */
telegramRouter.post('/webhook', telegramController.telegramWebhook);

/**
 * Authenticated linking-code generator. Returns a one-time deep-link URL
 * for the user to open in Telegram.
 */
telegramRouter.post(
  '/start-linking',
  requireAuth,
  telegramController.startLinking,
);
