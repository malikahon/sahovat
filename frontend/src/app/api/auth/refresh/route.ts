import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getRefreshToken, setAuthCookies, clearAuthCookies } from '@/lib/auth-cookies';

/**
 * POST /api/auth/refresh
 * Reads refresh_token from cookie, sends to Express backend,
 * and stores new token pair in cookies.
 */
export async function POST() {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'No refresh token' },
        { status: 401 },
      );
    }

    const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Refresh token is invalid/expired -- clear cookies
      await clearAuthCookies();
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 },
      );
    }

    // Store new token pair
    const { tokens } = data.data;
    await setAuthCookies(tokens.access_token, tokens.refresh_token);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to refresh session' },
      { status: 500 },
    );
  }
}
