import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'leung_rek_session';

// Routes that require authentication
const PROTECTED_PAGE_ROUTES = ['/profile'];
const PROTECTED_API_ROUTES = [
  '/api/supabase/games/create',
  '/api/supabase/games/join',
  '/api/supabase/games/update',
  '/api/supabase/games/delete',
  '/api/supabase/stats/record',
];

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

async function verifyToken(token: string): Promise<{ id: string; role: string } | null> {
  const secret = getJwtSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    if (!payload.id || typeof payload.id !== 'string') return null;
    return {
      id: payload.id as string,
      role: (payload.role as string) ?? 'player',
    };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read and verify the JWT session cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifyToken(token) : null;

  // ─── Protected Page Routes ────────────────────────────────────────────────
  const isProtectedPage = PROTECTED_PAGE_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedPage && !user) {
    const loginUrl = new URL('/portal', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Protected API Routes ────────────────────────────────────────────────
  const isProtectedApi = PROTECTED_API_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedApi && !user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // ─── Attach user info to request headers for downstream routes ────────────
  const response = NextResponse.next();

  if (user) {
    // Set headers that downstream route handlers can read
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-role', user.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return response;
}

// Only run proxy on relevant routes, skip static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, sitemap.xml, robots.txt (metadata files)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|sitemap.xml|robots.txt).*)',
  ],
};
