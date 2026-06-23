import { apiFetch } from '@/lib/api/client';
import type { AuthPayload } from '@/lib/api/types';
import { clearSession, getSession, persistSession } from '@/lib/auth/session';

export async function refreshSession(): Promise<AuthPayload | null> {
  const session = await getSession();

  if (!session?.refreshToken) {
    return null;
  }

  try {
    const payload = await apiFetch<AuthPayload>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
    });

    if (payload.user.accountRole !== 'admin') {
      await clearSession();
      return null;
    }

    await persistSession(payload);
    return payload;
  } catch {
    await clearSession();
    return null;
  }
}
