import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * GET /api/admin/verification-documents
 * Proxy to backend — lists verification documents for admin review.
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();

    const res = await fetch(
      `${BACKEND_URL}/admin/verification-documents${qs ? `?${qs}` : ''}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch verification documents' },
      { status: 500 },
    );
  }
}
