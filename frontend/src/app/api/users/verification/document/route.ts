import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * POST /api/users/verification/document
 * Proxy to backend — uploads a KYC verification document.
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

    // Forward the raw multipart stream directly to the backend.
    // We MUST preserve the original Content-Type header (which contains the
    // multipart boundary string) rather than re-serializing FormData, because
    // Next.js FormData re-serialization can corrupt File objects and cause
    // multer on the backend to throw an unhandled error (INTERNAL_ERROR).
    const contentType = request.headers.get('Content-Type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'Expected multipart/form-data' },
        { status: 400 },
      );
    }

    const res = await fetch(`${BACKEND_URL}/users/verification/document`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
      },
      // @ts-expect-error — duplex is required for streaming request bodies in Node 18+
      duplex: 'half',
      body: request.body,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[verification/document] upload proxy error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to upload verification document' },
      { status: 500 },
    );
  }
}
