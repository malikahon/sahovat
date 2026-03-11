import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';

/**
 * POST /api/donations/webhook/payme
 * Dev-only: Simulates the PayMe webhook callback to complete a donation.
 * In production, PayMe calls the backend directly.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/donations/webhook/payme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Mock PayMe webhook header so backend mock service accepts it
        'x-payme-mock': 'true',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Webhook simulation failed' }, { status: 500 });
  }
}
