import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Protect routes under /dashboard — redirect to sign-in if unauthenticated.
// /t/[code] is intentionally public (spectator access, player token auth handled per-request).
export default withAuth(
  function middleware(_req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => token !== null,
    },
  },
);

export const config = {
  matcher: ['/dashboard/:path*', '/api/tournaments/:path*'],
};
