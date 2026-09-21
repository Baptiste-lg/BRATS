import { PrismaAdapter } from '@auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GitHubProvider from 'next-auth/providers/github';

import { db } from '@/lib/db';

// =============================================================================
// NextAuth configuration
// =============================================================================

const isNextBuild = process.env['NEXT_PHASE'] === 'phase-production-build';
const nextAuthSecret = process.env['NEXTAUTH_SECRET'] ?? (isNextBuild ? 'build-only-secret' : null);

if (!nextAuthSecret) {
  throw new Error('Missing required environment variable: NEXTAUTH_SECRET');
}

export const authOptions: NextAuthOptions = {
  // Use Prisma as the session/account store
  adapter: PrismaAdapter(db) as NonNullable<NextAuthOptions['adapter']>,

  providers: [
    // Do not register partially configured providers: NextAuth can expose a
    // broken sign-in method even when the corresponding feature is disabled.
    ...(process.env['EMAIL_SERVER']
      ? [
          EmailProvider({
            server: process.env['EMAIL_SERVER'],
            from: process.env['EMAIL_FROM'] ?? 'BRATS <noreply@brats.gg>',
          }),
        ]
      : []),
    ...(process.env['GITHUB_ID'] && process.env['GITHUB_SECRET']
      ? [
          GitHubProvider({
            clientId: process.env['GITHUB_ID'],
            clientSecret: process.env['GITHUB_SECRET'],
          }),
        ]
      : []),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    // Attach the database user id to the JWT
    async jwt({ token, user }) {
      if (user) {
        token['id'] = user.id;
      }
      return token;
    },

    // Expose the user id on the session object (available client-side)
    async session({ session, token }) {
      if (token['id'] && typeof token['id'] === 'string') {
        session.user.id = token['id'];
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  // Allow the build phase to run without copying production secrets into the
  // artifact; deployment configuration must still provide the real secret.
  secret: nextAuthSecret,

  debug: process.env['NODE_ENV'] === 'development',
};
