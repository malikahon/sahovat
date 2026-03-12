import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * GET /api/recurring-donations
 * Proxy to backend — lists user's recurring donations.
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { searchParams } = request.nextUrl;
    const qs = searchParams.toString();

    const res = await fetch(
      `${BACKEND_URL}/recurring-donations${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recurring donations' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/recurring-donations
 * Proxy to backend — creates a new recurring donation.
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/recurring-donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create recurring donation' },
      { status: 500 },
    );
  }
}
