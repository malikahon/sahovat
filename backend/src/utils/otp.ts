/**
 * OTP (One-Time Password) utility functions
 * Handles generation, storage, verification, and attempt tracking
 */

import { getRedisClient } from '../config/redis';
import { config } from '../config';

const OTP_ATTEMPTS_MAX = 5;
const OTP_ATTEMPTS_TTL = 15 * 60; // 15 minutes in seconds

/**
 * Generates a random numeric OTP
 * @param length - Length of OTP (default from config)
 * @returns Random numeric OTP string
 */
export function generateOTP(length?: number): string {
  const otpLength = length || config.otp.length;
  const max = Math.pow(10, otpLength) - 1;
  const min = Math.pow(10, otpLength - 1);
  const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomNum.toString().padStart(otpLength, '0');
}

/**
 * Stores OTP in Redis with TTL
 * @param phoneNumber - User's phone number
 * @param otp - OTP to store
 */
export async function storeOTP(phoneNumber: string, otp: string): Promise<void> {
  const redisClient = getRedisClient();
  const key = `otp:${phoneNumber}`;
  await redisClient.setEx(key, config.otp.expiresIn, otp);
}

/**
 * Verifies OTP and deletes it on successful match
 * @param phoneNumber - User's phone number
 * @param otp - OTP to verify
 * @returns True if OTP matches and is valid, false otherwise
 */
export async function verifyOTP(phoneNumber: string, otp: string): Promise<boolean> {
  const redisClient = getRedisClient();
  const key = `otp:${phoneNumber}`;
  const storedOTP = await redisClient.get(key);

  if (storedOTP && storedOTP === otp) {
    // Delete OTP after successful verification
    await redisClient.del(key);
    return true;
  }

  return false;
}

/**
 * Gets the number of failed OTP attempts for a phone number
 * @param phoneNumber - User's phone number
 * @returns Number of failed attempts
 */
export async function getOTPAttempts(phoneNumber: string): Promise<number> {
  const redisClient = getRedisClient();
  const key = `otp_attempts:${phoneNumber}`;
  const attempts = await redisClient.get(key);
  return attempts ? parseInt(attempts, 10) : 0;
}

/**
 * Increments the failed OTP attempt counter
 * @param phoneNumber - User's phone number
 */
export async function incrementOTPAttempts(phoneNumber: string): Promise<void> {
  const redisClient = getRedisClient();
  const key = `otp_attempts:${phoneNumber}`;
  const currentAttempts = await getOTPAttempts(phoneNumber);

  if (currentAttempts === 0) {
    // First attempt, set with TTL
    await redisClient.setEx(key, OTP_ATTEMPTS_TTL, '1');
  } else {
    // Increment existing counter
    await redisClient.incr(key);
  }
}

/**
 * Clears the failed OTP attempts for a phone number
 * @param phoneNumber - User's phone number
 */
export async function clearOTPAttempts(phoneNumber: string): Promise<void> {
  const redisClient = getRedisClient();
  const key = `otp_attempts:${phoneNumber}`;
  await redisClient.del(key);
}

/**
 * Checks if a phone number is locked due to too many failed attempts
 * @param phoneNumber - User's phone number
 * @returns True if locked, false otherwise
 */
export async function isOTPLocked(phoneNumber: string): Promise<boolean> {
  const attempts = await getOTPAttempts(phoneNumber);
  return attempts >= OTP_ATTEMPTS_MAX;
}
