import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * GET /api/users/oneid/initiate
 * Proxy to backend — initiates OneID verification flow.
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

    const res = await fetch(`${BACKEND_URL}/users/oneid/initiate`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to initiate OneID verification' },
      { status: 500 },
    );
  }
}
