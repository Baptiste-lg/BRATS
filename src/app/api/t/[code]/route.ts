import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { isValidTournamentCode } from '@/lib/tournament-code';

interface Params {
  params: Promise<{ code: string }>;
}

// GET /api/t/[code] — public tournament data by short code
// Used by the public bracket page. No auth required.
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { code } = await params;

    if (!isValidTournamentCode(code)) throw new ValidationError('Invalid tournament code');

    const token = request.nextUrl.searchParams.get('token');
    const player = token
      ? await db.player.findUnique({
          where: { token },
          select: { id: true, tournamentId: true },
        })
      : null;

    const tournament = await db.tournament.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        name: true,
        format: true,
        status: true,
        players: {
          orderBy: { seed: 'asc' },
          select: { name: true, seed: true },
        },
        matches: {
          orderBy: [{ round: 'asc' }, { position: 'asc' }],
          select: {
            id: true,
            round: true,
            position: true,
            bracketSide: true,
            scoreA: true,
            scoreB: true,
            status: true,
            playerA: { select: { id: true, name: true } },
            playerB: { select: { id: true, name: true } },
            winner: { select: { name: true } },
          },
        },
      },
    });

    if (!tournament) throw new NotFoundError('Tournament not found');

    const { id: tournamentId, ...publicTournament } = tournament;
    const canUseToken = player?.tournamentId === tournamentId;
    return ok({
      ...publicTournament,
      matches: publicTournament.matches.map((match) => ({
        ...match,
        playerA: match.playerA ? { name: match.playerA.name } : null,
        playerB: match.playerB ? { name: match.playerB.name } : null,
        canPlayerReport:
          canUseToken && (match.playerA?.id === player?.id || match.playerB?.id === player?.id),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}
