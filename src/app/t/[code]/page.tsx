import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/ui/Navbar';
import { TournamentClient } from './TournamentClient';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import type { TournamentRole, PublicMatch } from '@/types/tournament';

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const tournament = await db.tournament.findUnique({ where: { code } });
  return {
    title: tournament?.name ?? 'Tournament',
  };
}

export default async function TournamentPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { token } = await searchParams;

  const tournament = await db.tournament.findUnique({
    where: { code },
    include: {
      players: { orderBy: { seed: 'asc' } },
      matches: {
        orderBy: [{ round: 'asc' }, { position: 'asc' }],
        include: {
          playerA: { select: { id: true, name: true, seed: true } },
          playerB: { select: { id: true, name: true, seed: true } },
          winner: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!tournament) notFound();

  // Determine role
  const user = await getCurrentUser();
  let role: TournamentRole = 'spectator';
  let resolvedToken: string | undefined;

  if (user?.id && user.id === tournament.organizerId) {
    role = 'organizer';
  } else if (token) {
    // Verify player token
    const player = await db.player.findUnique({ where: { token } });
    if (player && player.tournamentId === tournament.id) {
      role = 'player';
      resolvedToken = token;
    }
  }

  // Map to public-safe shape
  const matches: PublicMatch[] = tournament.matches.map((m) => ({
    id: m.id,
    round: m.round,
    position: m.position,
    bracketSide: m.bracketSide,
    playerA: m.playerA ? { name: m.playerA.name } : null,
    playerB: m.playerB ? { name: m.playerB.name } : null,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    winner: m.winner ? { name: m.winner.name } : null,
    status: m.status,
  }));

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <TournamentClient
          tournamentId={tournament.id}
          tournamentCode={tournament.code}
          tournamentName={tournament.name}
          initialMatches={matches}
          role={role}
          playerToken={resolvedToken}
        />
      </main>
    </>
  );
}
