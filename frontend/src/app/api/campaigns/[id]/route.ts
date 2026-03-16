import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * GET /api/campaigns/[id]
 * Proxy to backend — get campaign details.
 * Wraps backend response so frontend receives { success, data: { campaign } }.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();

    const res = await fetch(`${BACKEND_URL}/campaigns/${id}`, {
      method: 'GET',
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    });

    const data = await res.json();

    // Backend returns { success, data: CampaignWithStats }
    // Frontend expects { success, data: { campaign: CampaignWithStats } }
    if (data.success && data.data && !data.data.campaign) {
      return NextResponse.json(
        { success: true, data: { campaign: data.data } },
        { status: res.status },
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/campaigns/[id]
 * Proxy to backend — update campaign.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/campaigns/${id}`, {
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
      { success: false, error: 'Failed to update campaign' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/campaigns/[id]
 * Proxy to backend — delete draft campaign.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const res = await fetch(`${BACKEND_URL}/campaigns/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete campaign' },
      { status: 500 },
    );
  }
}
