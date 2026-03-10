import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Set auth tokens as httpOnly cookies.
 * - access_token: 15min, path=/
 * - refresh_token: 7 days, path=/api/auth (only sent on auth requests)
 */
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Get the access token from cookies.
 */
export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

/**
 * Get the refresh token from cookies.
 */
export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
}

/**
 * Clear all auth cookies (logout).
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  });
}
