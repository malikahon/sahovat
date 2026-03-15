import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';

/**
 * GET /api/donations/fee-info
 * Public endpoint — returns current platform fee percentage.
 */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/donations/fee-info`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee info' },
      { status: 500 },
    );
  }
}
