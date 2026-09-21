import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Protect routes under /dashboard — redirect to sign-in if unauthenticated.
// /t/[code] is intentionally public (spectator access, player token auth handled per-request).
export default async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  if (token) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const signInUrl = new URL('/auth/signin', req.url);
  signInUrl.searchParams.set('callbackUrl', req.url);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/tournaments/:path*'],
};
