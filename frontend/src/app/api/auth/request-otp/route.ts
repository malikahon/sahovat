import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';

/**
 * POST /api/auth/request-otp
 * Proxies to Express backend. No cookies needed (pre-auth).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP' },
      { status: 500 },
    );
  }
}
