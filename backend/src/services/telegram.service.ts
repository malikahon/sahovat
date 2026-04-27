import { env } from '../config/env.js';
import type { TelegramService, TelegramMessageParams } from '../types/services.js';
import {
  mask,
  publishMockNotification,
  truncatePreview,
} from './notifications/demo-stream.js';

/**
 * Outbound Telegram bot client.
 *
 * Uses the Bot API HTTPS endpoint:
 *   https://api.telegram.org/bot<token>/sendMessage
 *
 * No polling. No webhook. This service is push-only — incoming
 * updates (e.g. /start linking) are handled by a separate
 * controller (modules/telegram/telegram.controller.ts).
 */

const DEFAULT_PARSE_MODE: 'HTML' = 'HTML';

// ============================================================
// REAL TELEGRAM SERVICE
// ============================================================

class RealTelegramService implements TelegramService {
  private readonly endpoint: string;

  constructor() {
    if (!env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is required for RealTelegramService');
    }
    const base = env.TELEGRAM_API_BASE.replace(/\/$/, '');
    this.endpoint = `${base}/bot${env.TELEGRAM_BOT_TOKEN}`;
  }

  async sendMessage(
    chatId: string,
    params: TelegramMessageParams,
  ): Promise<{ message_id: number }> {
    const body = {
      chat_id: chatId,
      text: params.text,
      parse_mode: params.parse_mode ?? DEFAULT_PARSE_MODE,
      disable_web_page_preview: params.disable_web_page_preview ?? true,
    };

    const response = await fetch(`${this.endpoint}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      // 403 = user blocked the bot or never started it. Permanent for that
      // chat; the caller (dispatcher) should treat as non-retryable.
      throw new Error(
        `Telegram sendMessage failed (${response.status}): ${text}`,
      );
    }

    const data = (await response.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };

    if (!data.ok || !data.result?.message_id) {
      throw new Error(
        `Telegram sendMessage returned not-ok: ${data.description ?? 'unknown'}`,
      );
    }

    console.log(
      `[Sahovat] Telegram message sent to chat ${chatId} (msg_id=${data.result.message_id})`,
    );

    return { message_id: data.result.message_id };
  }
}

// ============================================================
// MOCK TELEGRAM SERVICE
// ============================================================

class MockTelegramService implements TelegramService {
  async sendMessage(
    chatId: string,
    params: TelegramMessageParams,
  ): Promise<{ message_id: number }> {
    const messageId = Math.floor(Date.now() / 1000) % 2_000_000_000;
    const preview = params.text.slice(0, 120).replace(/\n/g, ' ');
    console.log(
      `[Sahovat] [MOCK TG] → chat=${chatId} msg_id=${messageId} text="${preview}${params.text.length > 120 ? '…' : ''}"`,
    );
    await publishMockNotification({
      channel: 'telegram',
      recipient: mask.telegram(chatId),
      preview: truncatePreview(params.text),
    });
    return { message_id: messageId };
  }
}

// ============================================================
// FACTORY
// ============================================================

/**
 * Selects the Telegram implementation based on env.TELEGRAM_PROVIDER.
 * - 'real' → RealTelegramService (production)
 * - 'mock' → MockTelegramService (dev/test default)
 *
 * In production the env validator guarantees TELEGRAM_BOT_TOKEN is set
 * when TELEGRAM_PROVIDER=real, so the constructor cannot throw at boot.
 */
export function createTelegramService(): TelegramService {
  if (env.TELEGRAM_PROVIDER === 'real' && env.TELEGRAM_BOT_TOKEN) {
    console.log('[Sahovat] Using real Telegram bot service');
    return new RealTelegramService();
  }
  console.log('[Sahovat] Using mock Telegram bot service');
  return new MockTelegramService();
}

/** Singleton Telegram service instance. */
export const telegramService: TelegramService = createTelegramService();
