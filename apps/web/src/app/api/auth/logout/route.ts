import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api';
import { clearSession, getRefreshToken } from '@/lib/session';

export async function POST() {
  const refreshToken = await getRefreshToken();

  try {
    if (refreshToken) {
      await backendFetch('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
      });
    }
  } catch {
    // Local session cleanup should still happen when the backend rejects logout.
  }

  await clearSession();
  return NextResponse.json({ success: true });
}
