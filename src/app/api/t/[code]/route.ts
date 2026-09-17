import type { NextRequest } from 'next/server';
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
      select: {
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
            playerA: { select: { name: true } },
            playerB: { select: { name: true } },
            winner: { select: { name: true } },
          },
        },
      },
    });

    if (!tournament) throw new NotFoundError('Tournament not found');
    return ok(tournament);
  } catch (error) {
    return handleError(error);
  }
}
