import { PrismaAdapter } from '@auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GitHubProvider from 'next-auth/providers/github';

import { db } from '@/lib/db';

// =============================================================================
// NextAuth configuration
// =============================================================================

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const authOptions: NextAuthOptions = {
  // Use Prisma as the session/account store
  adapter: PrismaAdapter(db) as NextAuthOptions['adapter'],

  providers: [
    // Magic link email — no password required
    EmailProvider({
      server: process.env['EMAIL_SERVER'] ?? '',
      from: process.env['EMAIL_FROM'] ?? 'BRATS <noreply@brats.gg>',
    }),

    // GitHub OAuth — for developers and power users
    GitHubProvider({
      clientId: process.env['GITHUB_ID'] ?? '',
      clientSecret: process.env['GITHUB_SECRET'] ?? '',
    }),
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

  secret: requireEnv('NEXTAUTH_SECRET'),

  debug: process.env['NODE_ENV'] === 'development',
};
