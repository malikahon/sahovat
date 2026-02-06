/**
 * JWT (JSON Web Token) utility functions
 * Handles generation, verification, and storage of access and refresh tokens
 */

import jwt from 'jsonwebtoken';
import { getRedisClient } from '../config/redis';
import { config } from '../config';
import { AppError } from '../middlewares/errorHandler';

export interface TokenPayload {
  userId: string;
  isAdmin: boolean;
}

/**
 * Generates an access token
 * @param payload - Token payload containing userId and isAdmin
 * @returns Signed access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as string | number,
  } as jwt.SignOptions);
}

/**
 * Generates a refresh token
 * @param payload - Token payload containing userId and isAdmin
 * @returns Signed refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as string | number,
  } as jwt.SignOptions);
}

/**
 * Verifies an access token and returns its payload
 * @param token - Access token to verify
 * @returns Decoded token payload
 * @throws AppError if token is invalid or expired
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Access token has expired', 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid access token', 401);
    }
    throw new AppError('Token verification failed', 401);
  }
}

/**
 * Verifies a refresh token and returns its payload
 * @param token - Refresh token to verify
 * @returns Decoded token payload
 * @throws AppError if token is invalid or expired
 */
export function verifyRefreshToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Refresh token has expired', 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid refresh token', 401);
    }
    throw new AppError('Token verification failed', 401);
  }
}

/**
 * Generates both access and refresh tokens
 * @param payload - Token payload
 * @returns Object containing both access and refresh tokens
 */
export function generateTokenPair(payload: TokenPayload): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Stores a refresh token in Redis for a user
 * @param userId - User ID
 * @param token - Refresh token to store
 */
export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const redisClient = getRedisClient();
  const key = `refresh:${userId}`;
  // 7 days in seconds (7 * 24 * 60 * 60)
  const ttl = 7 * 24 * 60 * 60;
  await redisClient.setEx(key, ttl, token);
}

/**
 * Removes a refresh token from Redis
 * @param userId - User ID
 */
export async function removeRefreshToken(userId: string): Promise<void> {
  const redisClient = getRedisClient();
  const key = `refresh:${userId}`;
  await redisClient.del(key);
}

/**
 * Checks if a stored refresh token matches the provided token
 * @param userId - User ID
 * @param token - Token to validate
 * @returns True if token matches stored token, false otherwise
 */
export async function isRefreshTokenValid(userId: string, token: string): Promise<boolean> {
  const redisClient = getRedisClient();
  const key = `refresh:${userId}`;
  const storedToken = await redisClient.get(key);
  return storedToken === token;
}
