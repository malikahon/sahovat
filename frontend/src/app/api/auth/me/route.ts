import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * GET /api/auth/me
 * Reads access_token from cookie and forwards to Express backend.
 * Returns the current authenticated user's data.
 */
export async function GET() {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // If token is expired (401), try refreshing
    if (res.status === 401) {
      return NextResponse.json(
        { success: false, error: 'Token expired' },
        { status: 401 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 },
    );
  }
}
