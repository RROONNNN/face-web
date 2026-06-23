import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_PATH_PREFIXES,
  AUTH_ACCESS_COOKIE,
  AUTH_ROLE_COOKIE,
} from './src/lib/auth/cookies';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(AUTH_ACCESS_COOKIE)?.value;
  const role = request.cookies.get(AUTH_ROLE_COOKIE)?.value;
  const isAdminPath = ADMIN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(accessToken && role === 'admin' ? '/dashboard' : '/login', request.url),
    );
  }

  if (pathname === '/login' && accessToken && role === 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isAdminPath && (!accessToken || role !== 'admin')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/employees/:path*',
    '/departments/:path*',
    '/shifts/:path*',
    '/shift-assignments/:path*',
    '/attendance/:path*',
    '/leave-requests/:path*',
    '/holidays/:path*',
    '/settings/:path*',
  ],
};
