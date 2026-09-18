'use client';

import { signIn } from 'next-auth/react';
import type { ClientSafeProvider, LiteralUnion } from 'next-auth/react';
import type { BuiltInProviderType } from 'next-auth/providers/index';
import { useState } from 'react';

interface Props {
  providers: Record<LiteralUnion<BuiltInProviderType, string>, ClientSafeProvider> | null;
}

export function SignInForm({ providers }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signIn('email', { email: email.trim(), redirect: false });
      if (result?.error) {
        setError('Could not send magic link. Please try again.');
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-center">
        <p className="text-green-400">
          Magic link sent! Check your inbox at <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
      {/* Email magic link */}
      <form onSubmit={handleEmailSignIn} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand-500 px-4 py-3 font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send magic link'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-sm text-gray-500">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* OAuth providers */}
      {providers &&
        Object.values(providers)
          .filter((p) => p.id !== 'email')
          .map((provider) => (
            <button
              key={provider.id}
              onClick={() => signIn(provider.id, { callbackUrl: '/dashboard' })}
              className="flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:bg-white/10"
            >
              <span>Continue with {provider.name}</span>
            </button>
          ))}
    </div>
  );
}
