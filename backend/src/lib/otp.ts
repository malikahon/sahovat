import { randomInt, timingSafeEqual } from 'node:crypto';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

const DEFAULT_PREFIX = 'otp';
const ATTEMPTS_SUFFIX = '_attempts';

/**
 * Builds the Redis key for a stored OTP code.
 * Examples:
 *   otpKey('+998901234567')                  -> 'otp:+998901234567'
 *   otpKey('user@example.com', 'otp:email')  -> 'otp:email:user@example.com'
 */
function otpKey(identifier: string, prefix: string = DEFAULT_PREFIX): string {
  return `${prefix}:${identifier}`;
}

function attemptsKey(identifier: string, prefix: string = DEFAULT_PREFIX): string {
  return `${prefix}${ATTEMPTS_SUFFIX}:${identifier}`;
}

/**
 * Generates a cryptographically random 6-digit OTP string.
 */
export function generateOtp(): string {
  return randomInt(100_000, 1_000_000).toString();
}

/**
 * Stores an OTP in Redis with the configured TTL.
 *
 * @param identifier  Phone number, email, or other user-scoped identifier.
 * @param otp         The 6-digit code to store.
 * @param prefix      Redis key prefix (default 'otp' for phone; pass 'otp:email' for email).
 */
export async function storeOtp(
  identifier: string,
  otp: string,
  prefix: string = DEFAULT_PREFIX,
): Promise<void> {
  await redis.set(otpKey(identifier, prefix), otp, 'EX', env.OTP_TTL_SECONDS);
}

/**
 * Verifies an OTP against the stored value.
 * On success: deletes the OTP and attempts counter, returns true.
 * On failure: increments the attempts counter, returns false.
 */
export async function verifyOtp(
  identifier: string,
  otp: string,
  prefix: string = DEFAULT_PREFIX,
): Promise<boolean> {
  // Check lockout inside verify to reduce race window
  const locked = await isOtpLocked(identifier, prefix);
  if (locked) {
    return false;
  }

  const key = otpKey(identifier, prefix);
  const storedOtp = await redis.get(key);

  if (!storedOtp) {
    await incrementOtpAttempts(identifier, prefix);
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks on OTP guessing
  const storedBuf = Buffer.from(storedOtp);
  const otpBuf = Buffer.from(otp);
  if (storedBuf.length !== otpBuf.length || !timingSafeEqual(storedBuf, otpBuf)) {
    await incrementOtpAttempts(identifier, prefix);
    return false;
  }

  // OTP is valid — clean up
  await redis.del(key, attemptsKey(identifier, prefix));

  return true;
}

/**
 * Checks whether the identifier has been locked out due to too many failed attempts.
 */
export async function isOtpLocked(
  identifier: string,
  prefix: string = DEFAULT_PREFIX,
): Promise<boolean> {
  const attempts = await redis.get(attemptsKey(identifier, prefix));

  if (attempts === null) {
    return false;
  }

  return parseInt(attempts, 10) >= env.OTP_MAX_ATTEMPTS;
}

/**
 * Increments the failed OTP attempt counter and sets the lockout TTL.
 */
export async function incrementOtpAttempts(
  identifier: string,
  prefix: string = DEFAULT_PREFIX,
): Promise<void> {
  const key = attemptsKey(identifier, prefix);
  await redis.incr(key);

  // Set/refresh TTL on every failed attempt to prevent TTL drain attacks
  await redis.expire(key, env.OTP_LOCKOUT_SECONDS);
}
