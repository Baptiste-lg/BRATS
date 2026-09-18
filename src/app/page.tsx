import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6">
        {/* Hero */}
        <section className="flex flex-col items-center py-24 text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1 text-sm text-brand-500">
            Double-elimination · Mobile-first · Free
          </div>
          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight text-white md:text-6xl">
            Tournament brackets,
            <br />
            <span className="text-brand-500">done right.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-gray-400">
            Create a bracket in under a minute. Share one link. Players report their own scores — no
            sign-up required.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-lg bg-brand-500 px-8 py-3 font-semibold text-white transition hover:bg-brand-600"
            >
              Create a tournament
            </Link>
            <Link
              href="/auth/signin"
              className="rounded-lg border border-white/10 px-8 py-3 font-semibold text-gray-300 transition hover:border-white/20 hover:text-white"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Feature grid */}
        <section className="grid gap-6 pb-24 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
              <div className="mb-3 text-2xl">{f.icon}</div>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{f.description}</p>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}

const FEATURES = [
  {
    icon: '⚡',
    title: 'One-click bracket',
    description: 'Paste a player list, hit generate. Full double-elimination bracket in seconds.',
  },
  {
    icon: '🔗',
    title: 'One link to share',
    description: 'Players report their own scores via a unique link. No account required.',
  },
  {
    icon: '📊',
    title: 'Elo tracking',
    description: 'Persistent ratings across tournaments for players who link their account.',
  },
];
