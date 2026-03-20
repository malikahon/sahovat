import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken, setAuthCookies } from '@/lib/auth-cookies';

/**
 * POST /api/auth/register
 * Proxies to Express backend. Supports two flows:
 * 1. Authenticated user (has access_token cookie) completing profile
 * 2. New user with registration_token in body
 *
 * On success, stores returned JWT tokens in httpOnly cookies.
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    const body = await request.json();

    // Build headers — include Bearer token if available
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Store the new JWT tokens in httpOnly cookies
    if (data.data?.tokens?.access_token && data.data?.tokens?.refresh_token) {
      await setAuthCookies(data.data.tokens.access_token, data.data.tokens.refresh_token);
    }

    // Return user data without tokens
    return NextResponse.json({
      success: true,
      data: { user: data.data.user },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to register' },
      { status: 500 },
    );
  }
}
