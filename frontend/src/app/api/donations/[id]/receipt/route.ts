import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * GET /api/donations/[id]/receipt
 * Download the PDF receipt for a donation.
 * Streams the PDF buffer back to the client.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const res = await fetch(`${BACKEND_URL}/donations/${id}/receipt`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch receipt' },
        { status: res.status },
      );
    }

    // Stream the PDF directly
    const pdfBuffer = await res.arrayBuffer();
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="donation-receipt-${id}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch receipt' }, { status: 500 });
  }
}
