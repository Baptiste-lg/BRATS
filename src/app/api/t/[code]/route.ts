import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { NotFoundError } from '@/lib/errors';

interface Params {
  params: Promise<{ code: string }>;
}

// GET /api/t/[code] — public tournament data by short code
// Used by the public bracket page. No auth required.
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { code } = await params;

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
        organizer: { select: { id: true, name: true } },
      },
    });

    if (!tournament) throw new NotFoundError('Tournament not found');

    // Strip sensitive data — tokens are never returned in the public API
    const safe = {
      ...tournament,
      players: tournament.players.map(({ token: _token, userId: _userId, ...p }) => p),
    };

    return ok(safe);
  } catch (error) {
    return handleError(error);
  }
}
