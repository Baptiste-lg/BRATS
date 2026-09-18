import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { CreateTournamentForm } from '@/components/tournament/CreateTournamentForm';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect('/auth/signin');

  const tournaments = await db.tournament.findMany({
    where: { organizerId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { players: true, matches: true } } },
  });

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-2 text-gray-400">Manage your tournaments.</p>
        </div>

        {/* Create form */}
        <section className="mb-12 rounded-xl border border-white/5 bg-white/[0.03] p-8">
          <h2 className="mb-6 text-xl font-semibold text-white">New tournament</h2>
          <CreateTournamentForm />
        </section>

        {/* Tournament list */}
        {tournaments.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Your tournaments</h2>
            <ul className="flex flex-col gap-3">
              {tournaments.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/t/${t.code}`}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-6 py-4 transition hover:border-white/10 hover:bg-white/[0.05]"
                  >
                    <div>
                      <p className="font-medium text-white">{t.name}</p>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {t._count.players} players · {t.status.toLowerCase()}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">/t/{t.code}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
