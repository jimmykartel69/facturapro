import { NextRequest, NextResponse } from 'next/server';

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/session', // MUST be public to avoid infinite recursion
];

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(page + '/')
  );
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('facturapro_session')?.value;

  // --- Public endpoints (auth APIs): always pass through ---
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

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

  // --- API routes: just check cookie existence (each route validates via getCurrentUser) ---
  if (pathname.startsWith('/api/')) {
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // --- All other page routes: require valid session ---
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
