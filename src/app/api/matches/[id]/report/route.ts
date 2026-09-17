import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, handleError, parseBody } from '@/lib/api';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/matches/[id]/report — player reports their score
// Auth: player token (passed as query param ?token=...) OR organizer session
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const match = await db.match.findUnique({
      where: { id },
      include: {
        tournament: true,
        playerA: true,
        playerB: true,
      },
    });

    if (!match) throw new NotFoundError('Match not found');
    if (match.status !== 'PENDING') {
      throw new ValidationError('Match already has a reported score');
    }

    // Resolve who is reporting: player token or organizer
    const token = request.nextUrl.searchParams.get('token');
    let reporterId: string | null = null;

    if (token) {
      // Player token auth — find the player who owns this token
      const player = await db.player.findUnique({ where: { token } });
      if (!player) throw new ForbiddenError('Invalid player token');
      if (player.id !== match.playerAId && player.id !== match.playerBId) {
        throw new ForbiddenError('Token does not belong to a player in this match');
      }
      reporterId = player.id;
    }
    // If no token, the route is still protected by the middleware for organizers
    // (organizer can report on behalf of a player)

    const body = await parseBody(request, (raw) => {
      const b = raw as Record<string, unknown>;
      if (typeof b['scoreA'] !== 'number' || typeof b['scoreB'] !== 'number') {
        throw new ValidationError('scoreA and scoreB must be numbers');
      }
      if (b['scoreA'] < 0 || b['scoreB'] < 0) {
        throw new ValidationError('Scores cannot be negative');
      }
      if (b['scoreA'] === b['scoreB']) {
        throw new ValidationError('Scores cannot be tied');
      }
      return { scoreA: b['scoreA'] as number, scoreB: b['scoreB'] as number };
    });

    const updated = await db.match.update({
      where: { id },
      data: {
        scoreA: body.scoreA,
        scoreB: body.scoreB,
        status: 'AWAITING_VALIDATION',
        reportedById: reporterId,
      },
      include: {
        playerA: { select: { id: true, name: true } },
        playerB: { select: { id: true, name: true } },
      },
    });

    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}
