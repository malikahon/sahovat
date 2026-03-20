import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * GET /api/admin/verification-documents/:id/file
 * Proxy to backend — streams the private KYC document file for admin preview.
 * The response is the raw file bytes (image or PDF) with the correct Content-Type.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { id } = await params;

    const res = await fetch(
      `${BACKEND_URL}/admin/verification-documents/${id}/file`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!res.ok) {
      // Try to forward JSON error
      try {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      } catch {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch document file' },
          { status: res.status },
        );
      }
    }

    // Stream the file body back, preserving Content-Type and Content-Disposition
    const contentType = res.headers.get('Content-Type') ?? 'application/octet-stream';
    const contentDisposition = res.headers.get('Content-Disposition');

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'no-store');
    if (contentDisposition) headers.set('Content-Disposition', contentDisposition);

    return new NextResponse(res.body, { status: 200, headers });
  } catch (err) {
    console.error('[admin/verification-documents/file] proxy error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document file' },
      { status: 500 },
    );
  }
}
