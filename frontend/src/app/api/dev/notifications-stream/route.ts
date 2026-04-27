import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

/**
 * SSE proxy for the Demo Notifications Console.
 *
 * EventSource cannot attach an Authorization header from the browser, so
 * we proxy via this same-origin route, pulling the access token from the
 * httpOnly cookie and forwarding it server-side as a Bearer token.
 *
 * The upstream (`backend /api/dev/notifications-stream`) is itself gated
 * by `DEMO_CONSOLE_ENABLED=true` AND admin auth, so this route inherits
 * both gates implicitly.
 *
 * Production-safe: when the build does not have NEXT_PUBLIC_DEMO_CONSOLE
 * set, the frontend component never opens the EventSource, so this
 * route is unreachable in normal production traffic.
 */

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/dev/notifications-stream`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'text/event-stream',
      },
      // Stream the body — Node fetch returns a ReadableStream we can pipe.
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Upstream unreachable' },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    // Mirror the upstream status (e.g. 404 when DEMO_CONSOLE_ENABLED=false).
    return new NextResponse(null, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
