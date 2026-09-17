import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Not Found',
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <p className="text-6xl font-bold text-brand-500">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-white">Page not found</h1>
      <p className="mt-3 text-gray-400">
        This page does not exist, or the tournament link may have expired.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-brand-500 px-6 py-2.5 font-semibold text-white transition hover:bg-brand-600"
      >
        Back to home
      </Link>
    </main>
  );
}
