import jwt from 'jsonwebtoken';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';

const REFRESH_PREFIX = 'refresh:';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

export interface TokenPayload {
  userId: string;
  isAdmin: boolean;
}

interface JwtPayloadWithFields extends jwt.JwtPayload {
  userId: string;
  isAdmin: boolean;
}

/**
 * Generates a short-lived access token (15 minutes).
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    { userId: payload.userId, isAdmin: payload.isAdmin },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );
}

/**
 * Generates a long-lived refresh token (7 days).
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    { userId: payload.userId, isAdmin: payload.isAdmin },
    env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );
}

/**
 * Verifies and decodes an access token.
 * @throws {UnauthorizedError} if the token is invalid or expired.
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayloadWithFields;
    return { userId: decoded.userId, isAdmin: decoded.isAdmin };
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

/**
 * Verifies and decodes a refresh token.
 * @throws {UnauthorizedError} if the token is invalid or expired.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayloadWithFields;
    return { userId: decoded.userId, isAdmin: decoded.isAdmin };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

/**
 * Stores a refresh token in Redis with a 7-day TTL.
 */
export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const key = `${REFRESH_PREFIX}${userId}`;
  await redis.set(key, token, 'EX', REFRESH_TOKEN_TTL_SECONDS);
}

/**
 * Revokes a refresh token by deleting it from Redis.
 */
export async function revokeRefreshToken(userId: string): Promise<void> {
  const key = `${REFRESH_PREFIX}${userId}`;
  await redis.del(key);
}

/**
 * Validates a refresh token against the stored value in Redis.
 * Returns true if the token matches the stored token.
 */
export async function validateStoredRefreshToken(userId: string, token: string): Promise<boolean> {
  const key = `${REFRESH_PREFIX}${userId}`;
  const storedToken = await redis.get(key);

  if (!storedToken) {
    return false;
  }

  return storedToken === token;
}
