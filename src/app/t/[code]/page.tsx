import { cache } from 'react';
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

// Cached per-request so generateMetadata and the page handler share one query.
const getTournament = cache((code: string) =>
  db.tournament.findUnique({
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
  }),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const tournament = await getTournament(code);
  return {
    title: tournament?.name ?? 'Tournament',
  };
}

export default async function TournamentPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { token } = await searchParams;

  const tournament = await getTournament(code);

  if (!tournament) notFound();

  // Determine role
  const user = await getCurrentUser();
  let role: TournamentRole = 'spectator';
  let resolvedToken: string | undefined;

  if (user?.id && user.id === tournament.organizerId) {
    role = 'organizer';
  } else if (token) {
    // Verify player token
    const player = await db.player.findUnique({
      where: { token },
      select: { id: true, tournamentId: true },
    });
    if (player && player.tournamentId === tournament.id) {
      role = 'player';
      resolvedToken = token;
    }
  }

  const playerId =
    resolvedToken === undefined
      ? undefined
      : tournament.players.find((player) => player.token === resolvedToken)?.id;

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
    canPlayerReport:
      role === 'player' &&
      playerId !== undefined &&
      (m.playerA?.id === playerId || m.playerB?.id === playerId),
  }));

  const playerLinks =
    role === 'organizer'
      ? tournament.players.map((player) => ({ name: player.name, token: player.token }))
      : undefined;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <TournamentClient
          tournamentCode={tournament.code}
          tournamentName={tournament.name}
          initialMatches={matches}
          role={role}
          playerToken={resolvedToken}
          playerLinks={playerLinks}
        />
      </main>
    </>
  );
}
