import { NextRequest, NextResponse } from 'next/server';

// Auth pages (these show their own login/register UI)
const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

// Public API routes (no auth required)
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/session',
];

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(page + '/')
  );
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('facturapro_session')?.value;

  // Public auth API routes: always pass through
  if (isPublicApi(pathname)) {
    return NextResponse.next();
  }

  // Protected API routes: require session cookie
  // (each route handler validates the session fully via getCurrentUser)
  if (pathname.startsWith('/api/')) {
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Auth pages: if user has a cookie, redirect to app
  if (isAuthPage(pathname)) {
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // All other page routes: let through
  // Client-side Zustand + fetchSession() handles auth state
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
