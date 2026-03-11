import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * POST /api/campaigns/[id]/cover-image
 * Proxy to backend — upload/replace cover image (multipart).
 */
export async function POST(
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

    // Forward the multipart form data as-is
    const formData = await request.formData();
    const backendFormData = new FormData();
    for (const [key, value] of formData.entries()) {
      backendFormData.append(key, value);
    }

    const res = await fetch(`${BACKEND_URL}/campaigns/${id}/cover-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // Do NOT set Content-Type — fetch sets it with boundary for FormData
      },
      body: backendFormData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to upload cover image' },
      { status: 500 },
    );
  }
}
