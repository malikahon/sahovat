import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { setAuthCookies } from '@/lib/auth-cookies';

/**
 * POST /api/auth/verify-email-otp
 * Proxies to Express backend. On success:
 * - For existing users: stores JWT tokens in httpOnly cookies, returns user + is_new_user
 * - For new users: returns is_new_user + registration_token (no JWT tokens yet,
 *   unless user record was already partially created — then tokens are also returned)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/auth/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const { user, tokens, is_new_user, registration_token } = data.data;

    // Store JWT tokens in httpOnly cookies (if provided)
    if (tokens?.access_token && tokens?.refresh_token) {
      await setAuthCookies(tokens.access_token, tokens.refresh_token);
    }

    // Return user data without tokens, but include registration_token for new users
    const responseData: Record<string, unknown> = { user, is_new_user };
    if (registration_token) {
      responseData.registration_token = registration_token;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to verify OTP' },
      { status: 500 },
    );
  }
}
