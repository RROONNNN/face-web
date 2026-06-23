import type { AuthPayload, AuthUser } from '@/lib/api/types';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_USER_COOKIE,
} from '@/lib/auth/cookies';
import { cookies } from 'next/headers';

const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(AUTH_REFRESH_COOKIE)?.value;
  const user = decodeUser(cookieStore.get(AUTH_USER_COOKIE)?.value);

  if (!accessToken || !refreshToken || !user) {
    return null;
  }

  return { accessToken, refreshToken, user };
}

export async function persistSession(payload: AuthPayload): Promise<void> {
  const cookieStore = await cookies();

  try {
    cookieStore.set(AUTH_ACCESS_COOKIE, payload.accessToken, {
      ...baseCookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    });
    cookieStore.set(AUTH_REFRESH_COOKIE, payload.refreshToken, {
      ...baseCookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
    cookieStore.set(AUTH_USER_COOKIE, encodeUser(payload.user), {
      ...baseCookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
    cookieStore.set(AUTH_ROLE_COOKIE, payload.user.accountRole, {
      ...baseCookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
  } catch {
    // Ignore error when called from Server Component
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();

  for (const name of [
    AUTH_ACCESS_COOKIE,
    AUTH_REFRESH_COOKIE,
    AUTH_USER_COOKIE,
    AUTH_ROLE_COOKIE,
  ]) {
    try {
      cookieStore.delete(name);
    } catch {
      // Ignore error when called from Server Component
    }
  }
}

function encodeUser(user: AuthUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

function decodeUser(value: string | undefined): AuthUser | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as AuthUser;
  } catch {
    return null;
  }
}
