import { NextResponse } from 'next/server';
import { getAccessToken, getSession } from '@/lib/session';

export async function GET() {
  const [session, token] = await Promise.all([getSession(), getAccessToken()]);

  if (!session || !token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ token });
}
