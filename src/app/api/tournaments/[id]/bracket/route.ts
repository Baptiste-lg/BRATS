import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { requireAuth } from '@/lib/session';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';
import { generateBracket } from '@/lib/bracket';
import type { BracketPlayer } from '@/lib/bracket/types';
import { isBye } from '@/lib/bracket/types';

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/tournaments/[id]/bracket — generate the bracket from the player list
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const tournament = await db.tournament.findUnique({
      where: { id },
      select: { organizerId: true, status: true, format: true },
    });

    if (!tournament) throw new NotFoundError('Tournament not found');
    if (tournament.organizerId !== user.id) throw new ForbiddenError('Not your tournament');
    if (tournament.status !== 'DRAFT') {
      throw new ValidationError('Bracket already generated');
    }
    if (tournament.format !== 'DOUBLE_ELIMINATION') {
      throw new ValidationError('Only DOUBLE_ELIMINATION is currently supported');
    }
    await db.$transaction(async (tx) => {
      // Claim the draft before reading players. The conditional update makes
      // concurrent generate requests mutually exclusive and also blocks a
      // player insert from racing this snapshot.
      const claimed = await tx.tournament.updateMany({
        where: { id, organizerId: user.id, status: 'DRAFT' },
        data: { status: 'LIVE' },
      });
      if (claimed.count !== 1) {
        throw new ValidationError('Bracket already generated');
      }

      const current = await tx.tournament.findUnique({
        where: { id },
        include: { players: { orderBy: { seed: 'asc' } } },
      });
      if (!current) throw new NotFoundError('Tournament not found');
      if (current.format !== 'DOUBLE_ELIMINATION') {
        throw new ValidationError('Only DOUBLE_ELIMINATION is currently supported');
      }
      if (current.players.length < 2) {
        throw new ValidationError('Need at least 2 players to generate a bracket');
      }

      const players: BracketPlayer[] = current.players.map((player, i) => ({
        id: player.id,
        name: player.name,
        seed: player.seed ?? i + 1,
      }));
      const bracket = generateBracket(players);
      const persistedId = (engineId: string) => `${id}_${engineId}`;

      await tx.match.deleteMany({ where: { tournamentId: id } });
      await tx.match.createMany({
        data: bracket.matches.map((match) => ({
          // Engine IDs are stable within a bracket, while database IDs are
          // global. Prefix them with the tournament to avoid collisions
          // when two tournaments have the same bracket shape.
          id: persistedId(match.id),
          tournamentId: id,
          round: match.round,
          position: match.position,
          bracketSide: match.side,
          playerAId: match.playerA && 'id' in match.playerA ? match.playerA.id : null,
          playerBId: match.playerB && 'id' in match.playerB ? match.playerB.id : null,
          playerAIsBye: isBye(match.playerA),
          playerBIsBye: isBye(match.playerB),
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          winnerId: match.winnerId,
          status: match.status,
          // Match links are added after every row exists. PostgreSQL enforces
          // these self-referencing foreign keys immediately, so inserting a
          // bracket in engine order would fail when an early match points to
          // a later one.
          nextMatchId: null,
          nextMatchPosition: null,
          loserMatchId: null,
          loserMatchPosition: null,
        })),
      });

      for (const match of bracket.matches) {
        await tx.match.update({
          where: { id: persistedId(match.id) },
          data: {
            nextMatchId: match.nextMatchId ? persistedId(match.nextMatchId) : null,
            nextMatchPosition: match.nextMatchPosition,
            loserMatchId: match.loserMatchId ? persistedId(match.loserMatchId) : null,
            loserMatchPosition: match.loserMatchPosition,
          },
        });
      }
    });

    // Return the full tournament with matches
    const updated = await db.tournament.findUnique({
      where: { id },
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
    if (!updated) throw new NotFoundError('Tournament not found');

    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}
