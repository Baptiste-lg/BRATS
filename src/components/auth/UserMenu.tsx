'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { SignOutButton } from './SignOutButton';

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-8 w-24 animate-pulse rounded-md bg-white/10" />;
  }

  if (!session) {
    return (
      <Link
        href="/auth/signin"
        className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400">{session.user.name ?? session.user.email}</span>
      <Link href="/dashboard" className="text-sm text-gray-300 transition hover:text-white">
        Dashboard
      </Link>
      <SignOutButton className="text-sm text-gray-400 transition hover:text-white" />
    </div>
  );
}
