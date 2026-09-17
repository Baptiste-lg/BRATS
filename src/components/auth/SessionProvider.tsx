'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

interface Props {
  children: React.ReactNode;
  session?: Session | null;
}

/**
 * Wraps the app with NextAuth's SessionProvider so that useSession()
 * works in any Client Component.
 */
export function SessionProvider({ children, session }: Props) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
