import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * GET /api/campaigns/[id]/documents
 * Proxy to backend — list campaign documents.
 * Wraps backend response so frontend receives { success, data: { documents } }.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();

    const res = await fetch(`${BACKEND_URL}/campaigns/${id}/documents`, {
      method: 'GET',
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    });

    const data = await res.json();

    // Backend returns { success, data: Document[] }
    // Frontend expects { success, data: { documents: Document[] } }
    if (data.success && Array.isArray(data.data)) {
      return NextResponse.json(
        { success: true, data: { documents: data.data } },
        { status: res.status },
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/campaigns/[id]/documents
 * Proxy to backend — upload a document (multipart).
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

    const formData = await request.formData();
    const backendFormData = new FormData();
    for (const [key, value] of formData.entries()) {
      backendFormData.append(key, value);
    }

    const res = await fetch(`${BACKEND_URL}/campaigns/${id}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: backendFormData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 },
    );
  }
}
