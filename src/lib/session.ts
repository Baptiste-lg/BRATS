import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuthError } from '@/lib/errors';

export { AuthError } from '@/lib/errors';

// =============================================================================
// Server-side session helpers
// =============================================================================

/**
 * Returns the current session on the server, or null if unauthenticated.
 * Use in Server Components and Route Handlers.
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Returns the current user from the session, or null.
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Asserts that the request is authenticated and returns the user.
 * Throws an AuthError (401) if not.
 * Use in Route Handlers.
 */
export async function requireAuth(): Promise<{
  id: string;
  name?: string | null;
  email?: string | null;
}> {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new AuthError('Unauthorized', 401);
  }
  return user as { id: string; name?: string | null; email?: string | null };
}
