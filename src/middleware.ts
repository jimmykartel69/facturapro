import { NextRequest, NextResponse } from 'next/server';

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(page + '/')
  );
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('facturapro_session')?.value;

  // --- Auth pages: redirect authenticated users to / ---
  if (isAuthPage(pathname)) {
    if (sessionCookie) {
      try {
        const sessionRes = await fetch(
          new URL('/api/auth/session', request.url),
          {
            headers: { cookie: request.headers.get('cookie') || '' },
          }
        );
        const sessionData = await sessionRes.json();
        if (sessionData.user) {
          return NextResponse.redirect(new URL('/', request.url));
        }
      } catch {
        // Session invalid → allow access to auth page
      }
    }
    return NextResponse.next();
  }

  // --- Public API endpoints: always pass through ---
  if (isPublicApi(pathname)) {
    return NextResponse.next();
  }

  // --- All remaining routes require authentication ---
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const sessionRes = await fetch(
      new URL('/api/auth/session', request.url),
      {
        headers: { cookie: request.headers.get('cookie') || '' },
      }
    );
    const sessionData = await sessionRes.json();
    if (!sessionData.user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
