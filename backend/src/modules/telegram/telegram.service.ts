import { randomBytes } from 'node:crypto';
import { redis } from '../../config/redis.js';
import { query } from '../../config/database.js';
import { env } from '../../config/env.js';
import { telegramService } from '../../services/telegram.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors.js';

/**
 * /start <linking_code> deep-link flow.
 *
 * 1. User (already authenticated on the web) calls
 *    POST /api/users/me/telegram/start-linking → returns a one-time URL
 *    `t.me/<bot>?start=<code>`. The code is stored in Redis with a 10-min TTL.
 *
 * 2. User opens the URL on their phone, taps "Start" in the Telegram app.
 *    Telegram sends an Update to our /api/telegram/webhook with the code.
 *
 * 3. Webhook handler looks up the code in Redis, attaches `chat_id` to
 *    the user's row (telegram_id, telegram_username, telegram_photo_url),
 *    deletes the code, and replies with a confirmation message.
 *
 * This flow exists for users who didn't grant `data-request-access=write`
 * on the Login Widget — they have no chat_id captured yet, so push
 * notifications are blocked until they /start the bot.
 */

const LINK_CODE_PREFIX = 'tg-link:';
const LINK_CODE_TTL_SECONDS = 600;

/**
 * Generate an 8-char URL-safe linking code.
 */
function generateLinkingCode(): string {
  return randomBytes(6).toString('base64url'); // ~8 chars
}

/**
 * Create a one-time linking code for the given user. Returns the
 * deep-link URL the user should open.
 */
export async function startTelegramLinking(userId: string): Promise<{
  url: string;
  code: string;
  expiresInSeconds: number;
}> {
  // Reject if no bot username configured (frontend deep link would 404).
  if (!env.TELEGRAM_BOT_USERNAME) {
    throw new ValidationError('Telegram bot is not configured', 'TELEGRAM_NOT_CONFIGURED');
  }

  const code = generateLinkingCode();
  await redis.set(
    `${LINK_CODE_PREFIX}${code}`,
    userId,
    'EX',
    LINK_CODE_TTL_SECONDS,
  );
  return {
    url: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${code}`,
    code,
    expiresInSeconds: LINK_CODE_TTL_SECONDS,
  };
}

/**
 * Telegram Update payload subset we care about.
 *  https://core.telegram.org/bots/api#update
 */
interface TelegramUpdate {
  message?: {
    text?: string;
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    chat?: {
      id: number;
    };
  };
}

/**
 * Process an incoming Telegram bot update. Currently handles only
 * the `/start <code>` linking flow. Other update types are ignored.
 *
 * @returns short summary used for logging.
 */
export async function handleTelegramWebhook(update: TelegramUpdate): Promise<{
  handled: boolean;
  action?: string;
}> {
  const message = update.message;
  if (!message?.text || !message.from) {
    return { handled: false };
  }

  const text = message.text.trim();
  if (!text.startsWith('/start')) {
    return { handled: false };
  }

  // /start arg is everything after the first space.
  const arg = text.split(/\s+/, 2)[1] ?? '';
  if (!arg) {
    // Bare /start — no linking code. Reply with the bot intro.
    await replyTo(message.chat?.id ?? message.from.id, {
      uz: '👋 Sahovat botiga xush kelibsiz! Hisobingizni bog\u2018lash uchun saytdagi profil sahifasidan boshlang.',
    });
    return { handled: true, action: 'greet_no_code' };
  }

  const userId = await redis.get(`${LINK_CODE_PREFIX}${arg}`);
  if (!userId) {
    await replyTo(message.chat?.id ?? message.from.id, {
      uz: '⚠️ Bu havola muddati o\u2019tgan yoki yaroqsiz. Iltimos, saytdan yangi havola yarating.',
    });
    return { handled: true, action: 'invalid_code' };
  }

  const telegramId = message.from.id.toString();

  // Conflict check — refuse if telegram_id is already linked to a different user.
  const existing = await query(
    `SELECT id FROM users WHERE telegram_id = $1`,
    [telegramId],
  );
  if (existing.rows.length > 0 && (existing.rows[0] as { id: string }).id !== userId) {
    await replyTo(message.from.id, {
      uz: '⚠️ Ushbu Telegram allaqachon boshqa hisobga bog\u2019langan.',
    });
    return { handled: true, action: 'telegram_already_linked' };
  }

  const username = message.from.username ?? null;

  await query(
    `UPDATE users
     SET telegram_id = $1,
         telegram_username = COALESCE($2, telegram_username),
         telegram_linked_at = NOW(),
         updated_at = NOW()
     WHERE id = $3`,
    [telegramId, username, userId],
  );

  // Burn the linking code — single-use.
  await redis.del(`${LINK_CODE_PREFIX}${arg}`);

  await replyTo(message.from.id, {
    uz: '✅ Telegram hisobingiz Sahovatga muvaffaqiyatli bog\u2019landi. Endi shu yerda bildirishnomalar olasiz.',
  });

  console.log(
    `[Sahovat] Telegram linked via /start: user=${userId} chat_id=${telegramId} username=${username ?? 'none'}`,
  );
  return { handled: true, action: 'linked' };
}

/**
 * Sends a fixed-locale reply. Uses the outbound telegramService — but
 * tolerates failures silently because the webhook ack is what matters
 * to Telegram (a non-2xx will trigger redelivery).
 */
async function replyTo(
  chatId: number,
  texts: { uz: string },
): Promise<void> {
  try {
    await telegramService.sendMessage(chatId.toString(), {
      text: texts.uz,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('[Sahovat] Failed to send /start reply:', err);
  }
}

// Re-export for tests.
export const _testing = { LINK_CODE_PREFIX, LINK_CODE_TTL_SECONDS };
