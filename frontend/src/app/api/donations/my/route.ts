import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * GET /api/donations/my
 * List the authenticated user's donations.
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;

    const res = await fetch(`${BACKEND_URL}/donations/my?${searchParams.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch donations' }, { status: 500 });
  }
}
