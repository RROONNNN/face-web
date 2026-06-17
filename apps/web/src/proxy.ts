import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from './lib/session-constants';

const protectedRoutes = [
  '/dashboard',
  '/employees',
  '/shifts',
  '/attendance',
  '/leave',
  '/face',
  '/geofence',
  '/reports',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (pathname === '/' && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname === '/' || (pathname === '/login' && hasSession)) {
    return NextResponse.redirect(
      new URL(hasSession ? '/dashboard' : '/login', request.url),
    );
  }

  if (isProtected && !hasSession) {
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
    '/shifts/:path*',
    '/attendance/:path*',
    '/leave/:path*',
    '/face/:path*',
    '/geofence/:path*',
    '/reports/:path*',
  ],
};
