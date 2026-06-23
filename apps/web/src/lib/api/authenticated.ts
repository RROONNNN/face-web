import { apiFetch, ApiRequestError } from '@/lib/api/client';
import { refreshSession } from '@/lib/auth/refresh';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

type AuthenticatedApiOptions = Omit<Parameters<typeof apiFetch>[1], 'accessToken'>;

export async function authenticatedApiFetch<T>(
  path: string,
  options: AuthenticatedApiOptions = {},
): Promise<T> {
  const session = await getSession();

  if (!session) {
    throw new ApiRequestError('Authentication required.', 401);
  }

  try {
    return await apiFetch<T>(path, {
      ...options,
      accessToken: session.accessToken,
    });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.statusCode !== 401) {
      throw error;
    }

    const refreshed = await refreshSession();

    if (!refreshed) {
      redirect('/login');
    }

    return apiFetch<T>(path, {
      ...options,
      accessToken: refreshed.accessToken,
    });
  }
}
