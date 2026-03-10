import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * GET /api/users/profile
 * Proxy to backend — returns current user's profile.
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

    const res = await fetch(`${BACKEND_URL}/users/profile`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/users/profile
 * Proxy to backend — updates current user's profile.
 */
export async function PUT(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/users/profile`, {
      method: 'PUT',
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
      { success: false, error: 'Failed to update profile' },
      { status: 500 },
    );
  }
}
