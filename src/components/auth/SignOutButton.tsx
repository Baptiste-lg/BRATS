'use client';

import { signOut } from 'next-auth/react';

interface Props {
  className?: string;
}

export function SignOutButton({ className }: Props) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className={className}
    >
      Sign out
    </button>
  );
}
