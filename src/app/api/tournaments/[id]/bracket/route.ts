import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { requireAuth } from '@/lib/session';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';
import { generateBracket } from '@/lib/bracket';
import type { BracketPlayer } from '@/lib/bracket/types';

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
      include: { players: { orderBy: { seed: 'asc' } } },
    });

    if (!tournament) throw new NotFoundError('Tournament not found');
    if (tournament.organizerId !== user.id) throw new ForbiddenError('Not your tournament');
    if (tournament.status !== 'DRAFT') {
      throw new ValidationError('Bracket already generated');
    }
    if (tournament.players.length < 2) {
      throw new ValidationError('Need at least 2 players to generate a bracket');
    }

    // Map DB players to bracket engine format
    const players: BracketPlayer[] = tournament.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      seed: p.seed ?? i + 1,
    }));

    // Generate the pure bracket
    const bracket = generateBracket(players);

    // Persist matches and update tournament status in a transaction
    await db.$transaction([
      // Remove any existing matches (re-generation)
      db.match.deleteMany({ where: { tournamentId: id } }),

      // Create all matches
      ...bracket.matches.map((m) =>
        db.match.create({
          data: {
            tournamentId: id,
            round: m.round,
            position: m.position,
            bracketSide: m.side,
            playerAId: m.playerA && 'id' in m.playerA ? m.playerA.id : null,
            playerBId: m.playerB && 'id' in m.playerB ? m.playerB.id : null,
            winnerId: m.winnerId,
            status: m.status,
            // Store next/loser match references as JSON in a note field isn't ideal,
            // but for now we wire them as external IDs embedded in match ID strings.
            // The full wiring is computed client-side from match IDs.
          },
        }),
      ),

      // Transition tournament to LIVE
      db.tournament.update({
        where: { id },
        data: { status: 'LIVE' },
      }),
    ]);

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

    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}
