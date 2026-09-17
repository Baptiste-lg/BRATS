import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { requireAuth } from '@/lib/session';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/matches/[id]/validate — organizer validates the reported score
// Determines the winner, advances them to their next match, and drops
// the loser to the losers bracket (if applicable).
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const match = await db.match.findUnique({
      where: { id },
      include: {
        tournament: true,
        playerA: true,
        playerB: true,
      },
    });

    if (!match) throw new NotFoundError('Match not found');
    if (match.tournament.organizerId !== user.id) {
      throw new ForbiddenError('Only the organizer can validate scores');
    }
    if (match.status !== 'AWAITING_VALIDATION') {
      throw new ValidationError('Match is not awaiting validation');
    }
    if (match.scoreA === null || match.scoreB === null) {
      throw new ValidationError('Scores have not been reported yet');
    }

    // Determine winner and loser
    const winnerId = match.scoreA > match.scoreB
      ? match.playerAId
      : match.playerBId;
    const loserId = match.scoreA > match.scoreB
      ? match.playerBId
      : match.playerAId;

    if (!winnerId) throw new ValidationError('Cannot determine winner: missing player');

    // Advance winner and drop loser in a single transaction
    await db.$transaction(async (tx) => {
      // Mark match as done
      await tx.match.update({
        where: { id },
        data: {
          status: 'DONE',
          winnerId,
          validatedById: user.id,
        },
      });

      // Find the next match for the winner (same tournament, next round)
      const allMatches = await tx.match.findMany({
        where: { tournamentId: match.tournamentId },
        orderBy: [{ round: 'asc' }, { position: 'asc' }],
      });

      // The bracket engine stored next/loser pointers via match IDs embedded in
      // the match's bracketSide + round + position. Here we use a heuristic:
      // winner advances to the match in the next round at position ceil(position/2).
      const nextRound = match.round + 1;
      const nextPosition = Math.ceil(match.position / 2);
      const nextMatch = allMatches.find(
        (m) =>
          m.bracketSide === match.bracketSide &&
          m.round === nextRound &&
          m.position === nextPosition,
      );

      if (nextMatch) {
        const slot = match.position % 2 === 1 ? 'playerAId' : 'playerBId';
        await tx.match.update({
          where: { id: nextMatch.id },
          data: { [slot]: winnerId },
        });
      }

      // Drop loser to losers bracket (WINNERS matches only)
      if (match.bracketSide === 'WINNERS' && loserId) {
        // Find the corresponding losers bracket entry match.
        // Convention: losers entry round = 2*winnersRound - 1, paired by position.
        const lbEntryRound = 2 * match.round - 1;
        const lbPosition = Math.ceil(match.position / 2);
        const lbMatch = allMatches.find(
          (m) =>
            m.bracketSide === 'LOSERS' &&
            m.round === lbEntryRound &&
            m.position === lbPosition,
        );

        if (lbMatch) {
          const slot = match.position % 2 === 1 ? 'playerAId' : 'playerBId';
          await tx.match.update({
            where: { id: lbMatch.id },
            data: { [slot]: loserId },
          });
        }
      }
    });

    const updated = await db.match.findUnique({
      where: { id },
      include: {
        playerA: { select: { id: true, name: true } },
        playerB: { select: { id: true, name: true } },
        winner: { select: { id: true, name: true } },
      },
    });

    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}
