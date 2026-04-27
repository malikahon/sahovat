import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * POST /api/contact
 * Public endpoint — accepts both authenticated and guest submissions.
 * If a JWT is present in cookies it's forwarded so the backend can
 * associate the message with a user_id.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const accessToken = await getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    // Forward client IP so backend rate limiter sees the real address.
    const fwdFor = request.headers.get('x-forwarded-for');
    if (fwdFor) headers['x-forwarded-for'] = fwdFor;

    const res = await fetch(`${BACKEND_URL}/contact`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to submit contact message' },
      { status: 500 },
    );
  }
}
