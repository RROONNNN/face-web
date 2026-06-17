import 'server-only';

import type { ApiResponse, LoginPayload } from '@face-web/shared';
import { AccountRole } from '@face-web/shared';
import { API_BASE_URL } from './env';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setSession,
} from './session';

type BackendFetchOptions = Omit<RequestInit, 'body'> & {
  auth?: boolean;
  body?: unknown;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
  }
}

export async function backendFetch<T>(
  path: string,
  options: BackendFetchOptions = {},
): Promise<T> {
  const response = await rawBackendFetch(path, options);

  if (response.status === 401 && options.auth !== false) {
    const refreshed = await refreshSession();
    if (refreshed) {
      const retry = await rawBackendFetch(path, options);
      return unwrapResponse<T>(retry);
    }
  }

  return unwrapResponse<T>(response);
}

async function rawBackendFetch(path: string, options: BackendFetchOptions) {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth !== false) {
    const token = await getAccessToken();
    if (!token) {
      throw new ApiClientError('You need to sign in again.', 401);
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });
}

async function unwrapResponse<T>(response: Response): Promise<T> {
  let payload: ApiResponse<T> | null = null;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(
      response.ok ? 'Invalid backend response.' : response.statusText,
      response.status,
    );
  }

  if (!response.ok || payload.success === false) {
    const message =
      payload && payload.success === false
        ? Array.isArray(payload.message)
          ? payload.message.join(', ')
          : payload.message
        : response.statusText;
    throw new ApiClientError(message, response.status);
  }

  return payload.data;
}

async function refreshSession() {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  try {
    const refreshed = await backendFetch<LoginPayload>('/auth/refresh', {
      auth: false,
      method: 'POST',
      body: { refreshToken },
    });

    if (refreshed.user.accountRole !== AccountRole.Admin) {
      await clearSession();
      return false;
    }

    await setSession({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      user: refreshed.user,
    });
    return true;
  } catch {
    await clearSession();
    return false;
  }
}

export function messageFromError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}
