import type { Metadata } from 'next';
import { getProviders } from 'next-auth/react';
import { SignInForm } from './SignInForm';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to BRATS to create and manage tournaments.',
};

// getProviders() performs a request to the NextAuth endpoint and must not run
// while Next.js is statically collecting pages during a production build.
export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const providers = await getProviders();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">BRATS</h1>
          <p className="mt-2 text-gray-400">Sign in to manage your tournaments</p>
        </div>
        <SignInForm providers={providers} />
      </div>
    </main>
  );
}
