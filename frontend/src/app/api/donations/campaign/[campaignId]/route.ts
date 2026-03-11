import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * GET /api/donations/campaign/[campaignId]
 * List donations for a specific campaign (public with optional auth).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    const { campaignId } = await params;
    const accessToken = await getAccessToken();
    const { searchParams } = request.nextUrl;

    const res = await fetch(
      `${BACKEND_URL}/donations/campaign/${campaignId}?${searchParams.toString()}`,
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign donations' },
      { status: 500 },
    );
  }
}
