import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import { verifyTelegramAuth } from '../../../src/services/telegram-auth.service.js';
import { AppError } from '../../../src/lib/errors.js';

// Token must match TELEGRAM_BOT_TOKEN in vitest.config.ts.
const BOT_TOKEN = '123456:test_bot_token_for_fixtures';

/**
 * Helper: computes a valid HMAC for a given payload using the spec algorithm.
 * Used to construct fixtures inline so the tests double-check the algorithm
 * rather than relying on opaque pre-computed values.
 */
function signPayload(payload: Record<string, string | number>): string {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    flat[k] = String(v);
  }
  const dataCheckString = Object.keys(flat)
    .sort()
    .map((k) => `${k}=${flat[k]}`)
    .join('\n');
  const secretKey = createHash('sha256').update(BOT_TOKEN).digest();
  return createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
}

describe('verifyTelegramAuth', () => {
  const fixedNow = 1_700_000_000; // 2023-11-14 UTC, well within 24h of the auth_date below

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(fixedNow * 1000));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  function makeValidPayload(overrides: Record<string, string | number> = {}) {
    const base = {
      id: 12345678,
      first_name: 'Malika',
      last_name: 'Hon',
      username: 'malikahon_v',
      photo_url: 'https://t.me/i/userpic/test.jpg',
      auth_date: fixedNow - 60, // 1 minute ago
      ...overrides,
    };
    const hash = signPayload(base);
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(base)) {
      result[k] = String(v);
    }
    result['hash'] = hash;
    return result;
  }

  it('accepts a valid payload and returns parsed data', () => {
    const payload = makeValidPayload();
    const data = verifyTelegramAuth(payload);

    expect(data.id).toBe('12345678');
    expect(data.first_name).toBe('Malika');
    expect(data.last_name).toBe('Hon');
    expect(data.username).toBe('malikahon_v');
    expect(data.photo_url).toBe('https://t.me/i/userpic/test.jpg');
    expect(data.auth_date).toBe(fixedNow - 60);
  });

  it('accepts a minimal payload (no last_name, username, photo_url)', () => {
    const minimal = {
      id: 99,
      first_name: 'Solo',
      auth_date: fixedNow - 30,
    };
    const hash = signPayload(minimal);
    const data = verifyTelegramAuth({
      id: String(minimal.id),
      first_name: minimal.first_name,
      auth_date: String(minimal.auth_date),
      hash,
    });
    expect(data.id).toBe('99');
    expect(data.last_name).toBeUndefined();
    expect(data.username).toBeUndefined();
    expect(data.photo_url).toBeUndefined();
  });

  it('rejects when first_name was tampered after signing', () => {
    const payload = makeValidPayload();
    payload['first_name'] = 'Eve'; // tamper

    expect(() => verifyTelegramAuth(payload)).toThrow(AppError);
    try {
      verifyTelegramAuth(payload);
    } catch (err) {
      expect((err as AppError).code).toBe('INVALID_HASH');
      expect((err as AppError).statusCode).toBe(401);
    }
  });

  it('rejects when hash itself was tampered', () => {
    const payload = makeValidPayload();
    // Flip last char of the hash
    const last = payload['hash']!.slice(-1);
    const flipped = last === '0' ? '1' : '0';
    payload['hash'] = payload['hash']!.slice(0, -1) + flipped;

    expect(() => verifyTelegramAuth(payload)).toThrow(/Invalid Telegram hash/);
  });

  it('rejects when auth_date is older than 24h', () => {
    const payload = makeValidPayload({ auth_date: fixedNow - 86_401 });

    try {
      verifyTelegramAuth(payload);
      throw new Error('expected throw');
    } catch (err) {
      expect((err as AppError).code).toBe('EXPIRED_AUTH');
    }
  });

  it('rejects when hash is missing', () => {
    const payload = makeValidPayload();
    delete payload['hash'];

    try {
      verifyTelegramAuth(payload);
      throw new Error('expected throw');
    } catch (err) {
      expect((err as AppError).code).toBe('MALFORMED_PAYLOAD');
    }
  });

  it('rejects when required field (id) is missing', () => {
    const payload = makeValidPayload();
    delete payload['id'];

    try {
      verifyTelegramAuth(payload);
      throw new Error('expected throw');
    } catch (err) {
      expect((err as AppError).code).toBe('MALFORMED_PAYLOAD');
    }
  });

  it('rejects when hash contains non-hex characters', () => {
    const payload = makeValidPayload();
    payload['hash'] = 'not_a_valid_hex_string!!!!';

    expect(() => verifyTelegramAuth(payload)).toThrow(/Invalid Telegram hash/);
  });

  it('verifies even when extra unknown fields are present', () => {
    // Telegram may add fields in future; signing should include them.
    const base = {
      id: 555,
      first_name: 'Future',
      auth_date: fixedNow - 10,
      future_field: 'some_value',
    };
    const hash = signPayload(base);
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(base)) payload[k] = String(v);
    payload['hash'] = hash;

    const data = verifyTelegramAuth(payload);
    expect(data.id).toBe('555');
  });

  it('rejects extra fields when they were NOT signed', () => {
    const payload = makeValidPayload();
    payload['injected_field'] = 'bad';

    expect(() => verifyTelegramAuth(payload)).toThrow(/Invalid Telegram hash/);
  });
});
