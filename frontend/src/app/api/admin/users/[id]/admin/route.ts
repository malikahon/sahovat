import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';
import { getAccessToken } from '@/lib/auth-cookies';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/admin/users/${id}/admin`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
