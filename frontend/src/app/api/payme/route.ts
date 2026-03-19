import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';

/**
 * POST /api/payme
 * Proxy to backend — PayMe Merchant API callback.
 * 
 * This endpoint is called by PayMe's servers (not the browser).
 * It forwards the Authorization: Basic header as-is since PayMe
 * authenticates with its own credentials, not our JWT tokens.
 * 
 * In production, nginx should route /api/payme directly to the backend
 * to avoid unnecessary Next.js overhead. This BFF route exists as a
 * fallback for local development.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const res = await fetch(`${BACKEND_URL}/payme`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: 0,
        error: {
          code: -32400,
          message: { uz: 'Server error', ru: 'Server error', en: 'Server error' },
        },
      },
      { status: 500 },
    );
  }
}
