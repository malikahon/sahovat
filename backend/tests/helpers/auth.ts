/**
 * Authentication helpers for integration tests.
 * Generates valid JWT tokens for test users without going through the API.
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-min-32-characters-long!!';
const JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-32-chars-long!!';

/**
 * Generates a valid access token for the given user ID.
 */
export function generateTestAccessToken(userId: string, isAdmin = false): string {
  return jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Generates a valid refresh token for the given user ID.
 */
export function generateTestRefreshToken(userId: string, isAdmin = false): string {
  return jwt.sign({ userId, isAdmin }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

/**
 * Returns Authorization header object with Bearer token.
 */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Returns both tokens and header for a user.
 */
export function getTestAuth(userId: string, isAdmin = false): {
  accessToken: string;
  refreshToken: string;
  headers: { Authorization: string };
} {
  const accessToken = generateTestAccessToken(userId, isAdmin);
  const refreshToken = generateTestRefreshToken(userId, isAdmin);
  return {
    accessToken,
    refreshToken,
    headers: authHeader(accessToken),
  };
}
