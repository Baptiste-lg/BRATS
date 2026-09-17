import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Auth Error',
};

const ERRORS: Record<string, string> = {
  Configuration: 'Server configuration error.',
  AccessDenied: 'Access denied.',
  Verification: 'The sign-in link has expired or already been used.',
  Default: 'An unexpected error occurred.',
};

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const message = (error && ERRORS[error]) ?? ERRORS['Default']!;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-white">Sign-in error</h1>
        <p className="mt-3 text-gray-400">{message}</p>
        <Link
          href="/auth/signin"
          className="mt-6 inline-block rounded-md bg-brand-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
