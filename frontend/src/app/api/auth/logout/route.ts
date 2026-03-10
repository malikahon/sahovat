import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken, clearAuthCookies } from '@/lib/auth-cookies';

/**
 * POST /api/auth/logout
 * Reads access_token from cookie, calls Express backend to revoke refresh token,
 * then clears all auth cookies.
 */
export async function POST() {
  try {
    const accessToken = await getAccessToken();

    // Even if we don't have a token, clear cookies
    if (accessToken) {
      // Best-effort: notify backend to revoke refresh token
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch(() => {
        // Ignore errors -- we're logging out anyway
      });
    }

    await clearAuthCookies();

    return NextResponse.json({ success: true });
  } catch {
    // Clear cookies even on error
    await clearAuthCookies();
    return NextResponse.json({ success: true });
  }
}
