import Link from 'next/link';
import { UserMenu } from '@/components/auth/UserMenu';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-white transition hover:text-brand-500"
        >
          BRATS
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-gray-400 transition hover:text-white">
            Dashboard
          </Link>
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}
