import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';

/**
 * Verified payload returned by `verifyTelegramAuth`.
 * Mirrors the fields Telegram sends to the Login Widget callback.
 *
 * `id` is Telegram's numeric user ID (a 64-bit integer).
 * We keep it as a string to dodge JS Number precision issues; the
 * column type in PG is BIGINT.
 */
export interface TelegramAuthData {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
}

/**
 * Maximum age (seconds) of a `auth_date` we'll accept. 24 hours per
 * Telegram's recommended bound.
 */
const MAX_AUTH_AGE_SECONDS = 86_400;

/**
 * Builds the Telegram data-check-string from a payload.
 *
 * Per the spec (https://core.telegram.org/widgets/login#checking-authorization),
 * sort keys alphabetically (excluding `hash`) and join `key=value` pairs
 * with `\n`.
 */
function buildDataCheckString(payload: Record<string, string>): string {
  return Object.keys(payload)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join('\n');
}

/**
 * Verifies a Telegram Login Widget callback payload.
 *
 * Algorithm:
 *   1. Drop `hash` from the payload.
 *   2. Build sorted data-check-string.
 *   3. secret_key = SHA256(bot_token) — raw bytes, not hex.
 *   4. expected = HMAC_SHA256(secret_key, data_check_string) — hex digest.
 *   5. Compare in constant time to received `hash`.
 *   6. Reject if `auth_date` is older than 24h.
 *
 * @throws UnauthorizedError on any failure.
 */
export function verifyTelegramAuth(
  payload: Record<string, string | undefined>,
): TelegramAuthData {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new UnauthorizedError(
      'Telegram authentication is not configured on this server',
      'TELEGRAM_NOT_CONFIGURED',
    );
  }

  // Required fields
  const hash = payload['hash'];
  const id = payload['id'];
  const firstName = payload['first_name'];
  const authDateStr = payload['auth_date'];

  if (!hash || !id || !firstName || !authDateStr) {
    throw new UnauthorizedError('Malformed Telegram payload', 'MALFORMED_PAYLOAD');
  }

  // Coerce to a flat string-keyed map for hashing. Telegram sends primitives
  // only; we explicitly stringify to be defensive against numeric coercion.
  const stringPayload: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    stringPayload[key] = String(value);
  }

  const dataCheckString = buildDataCheckString(stringPayload);

  const secretKey = createHash('sha256').update(env.TELEGRAM_BOT_TOKEN).digest();
  const expectedHashHex = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Constant-time compare. Both strings must be the same length for
  // timingSafeEqual; if they differ, the hash is invalid by construction.
  const expectedBuf = Buffer.from(expectedHashHex, 'hex');
  let receivedBuf: Buffer;
  try {
    receivedBuf = Buffer.from(hash, 'hex');
  } catch {
    throw new UnauthorizedError('Invalid Telegram hash', 'INVALID_HASH');
  }

  if (
    receivedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(receivedBuf, expectedBuf)
  ) {
    throw new UnauthorizedError('Invalid Telegram hash', 'INVALID_HASH');
  }

  // auth_date freshness check
  const authDate = Number.parseInt(authDateStr, 10);
  if (!Number.isFinite(authDate)) {
    throw new UnauthorizedError('Invalid auth_date', 'MALFORMED_PAYLOAD');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - authDate > MAX_AUTH_AGE_SECONDS) {
    throw new UnauthorizedError(
      'Telegram auth payload has expired',
      'EXPIRED_AUTH',
    );
  }

  return {
    id,
    first_name: firstName,
    ...(payload['last_name'] !== undefined ? { last_name: String(payload['last_name']) } : {}),
    ...(payload['username'] !== undefined ? { username: String(payload['username']) } : {}),
    ...(payload['photo_url'] !== undefined ? { photo_url: String(payload['photo_url']) } : {}),
    auth_date: authDate,
  };
}
