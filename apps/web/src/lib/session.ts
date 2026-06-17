import 'server-only';

import { cookies } from 'next/headers';
import type { AdminUser } from '@face-web/shared';
import {
  ACCESS_TOKEN_COOKIE,
  ADMIN_USER_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './session-constants';

export { ACCESS_TOKEN_COOKIE, ADMIN_USER_COOKIE, REFRESH_TOKEN_COOKIE };

const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const secure = process.env.NODE_ENV === 'production';

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
};

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const encodedUser = cookieStore.get(ADMIN_USER_COOKIE)?.value;

  if (!accessToken || !refreshToken || !encodedUser) {
    return null;
  }

  try {
    return {
      accessToken,
      refreshToken,
      user: JSON.parse(decodeURIComponent(encodedUser)) as AdminUser,
    };
  } catch {
    return null;
  }
}

export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export async function getRefreshToken() {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}

export async function setSession(session: Session) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, session.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, session.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
  cookieStore.set(
    ADMIN_USER_COOKIE,
    encodeURIComponent(JSON.stringify(session.user)),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    },
  );
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(ADMIN_USER_COOKIE);
}
