import { randomInt } from 'node:crypto';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

const OTP_PREFIX = 'otp:';
const OTP_ATTEMPTS_PREFIX = 'otp_attempts:';

/**
 * Generates a cryptographically random 6-digit OTP string.
 */
export function generateOtp(): string {
  return randomInt(100_000, 1_000_000).toString();
}

/**
 * Stores an OTP in Redis with the configured TTL.
 */
export async function storeOtp(phone: string, otp: string): Promise<void> {
  const key = `${OTP_PREFIX}${phone}`;
  await redis.set(key, otp, 'EX', env.OTP_TTL_SECONDS);
}

/**
 * Verifies an OTP against the stored value.
 * On success: deletes the OTP and attempts counter, returns true.
 * On failure: increments the attempts counter, returns false.
 */
export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const key = `${OTP_PREFIX}${phone}`;
  const storedOtp = await redis.get(key);

  if (!storedOtp || storedOtp !== otp) {
    await incrementOtpAttempts(phone);
    return false;
  }

  // OTP is valid — clean up
  const attemptsKey = `${OTP_ATTEMPTS_PREFIX}${phone}`;
  await redis.del(key, attemptsKey);

  return true;
}

/**
 * Checks whether the phone number has been locked out due to too many failed attempts.
 */
export async function isOtpLocked(phone: string): Promise<boolean> {
  const attemptsKey = `${OTP_ATTEMPTS_PREFIX}${phone}`;
  const attempts = await redis.get(attemptsKey);

  if (attempts === null) {
    return false;
  }

  return parseInt(attempts, 10) >= env.OTP_MAX_ATTEMPTS;
}

/**
 * Increments the failed OTP attempt counter and sets the lockout TTL.
 */
export async function incrementOtpAttempts(phone: string): Promise<void> {
  const attemptsKey = `${OTP_ATTEMPTS_PREFIX}${phone}`;
  const current = await redis.incr(attemptsKey);

  // Set TTL on first attempt or refresh on subsequent attempts
  if (current === 1) {
    await redis.expire(attemptsKey, env.OTP_LOCKOUT_SECONDS);
  }
}
