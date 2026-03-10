import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { setAuthCookies } from '@/lib/auth-cookies';

/**
 * POST /api/auth/verify-otp
 * Proxies to Express backend. On success, stores tokens in httpOnly cookies
 * and returns user + is_new_user to the client (tokens are NOT sent to client).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Extract tokens and store in httpOnly cookies
    const { user, tokens, is_new_user } = data.data;
    await setAuthCookies(tokens.access_token, tokens.refresh_token);

    // Return user data without tokens
    return NextResponse.json({
      success: true,
      data: { user, is_new_user },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to verify OTP' },
      { status: 500 },
    );
  }
}
