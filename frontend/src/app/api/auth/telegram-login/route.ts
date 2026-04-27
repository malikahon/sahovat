import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { setAuthCookies } from '@/lib/auth-cookies';

/**
 * POST /api/auth/telegram-login
 * Proxies the Telegram Login Widget callback payload to the Express
 * backend, which performs HMAC verification and returns an AuthResponse.
 * On success, JWT tokens are stored in httpOnly cookies and only
 * { user, is_new_user } are returned to the client.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/auth/telegram-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const { user, tokens, is_new_user } = data.data;

    if (tokens?.access_token && tokens?.refresh_token) {
      await setAuthCookies(tokens.access_token, tokens.refresh_token);
    }

    return NextResponse.json({
      success: true,
      data: { user, is_new_user },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process Telegram login' },
      { status: 500 },
    );
  }
}
