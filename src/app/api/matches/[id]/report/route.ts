import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, handleError, parseBody } from '@/lib/api';
import { requireAuth } from '@/lib/session';
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
        tournament: { select: { organizerId: true, status: true } },
        playerA: { select: { id: true } },
        playerB: { select: { id: true } },
      },
    });

    if (!match) throw new NotFoundError('Match not found');
    if (match.tournament.status !== 'LIVE') {
      throw new ValidationError('Tournament is not live');
    }
    if (match.status !== 'PENDING') {
      throw new ValidationError('Match already has a reported score');
    }

    // Resolve who is reporting: player token or organizer.
    const token = request.nextUrl.searchParams.get('token');
    let reporterId: string | null = null;

    if (token) {
      // Player token auth — find the player who owns this token
      const player = await db.player.findUnique({ where: { token }, select: { id: true } });
      if (!player) throw new ForbiddenError('Invalid player token');
      if (player.id !== match.playerAId && player.id !== match.playerBId) {
        throw new ForbiddenError('Token does not belong to a player in this match');
      }
      reporterId = player.id;
    } else {
      const user = await requireAuth();
      if (match.tournament.organizerId !== user.id) {
        throw new ForbiddenError('Only the organizer can report a score without a player token');
      }
    }

    const body = await parseBody(request, (raw) => {
      const b = raw as Record<string, unknown>;
      const scoreA = b['scoreA'];
      const scoreB = b['scoreB'];
      const maxScore = 2_147_483_647;
      if (
        typeof scoreA !== 'number' ||
        typeof scoreB !== 'number' ||
        !Number.isSafeInteger(scoreA) ||
        !Number.isSafeInteger(scoreB) ||
        scoreA < 0 ||
        scoreB < 0 ||
        scoreA > maxScore ||
        scoreB > maxScore
      ) {
        throw new ValidationError('Scores must be non-negative integers');
      }
      if (scoreA === scoreB) {
        throw new ValidationError('Scores cannot be tied');
      }
      return { scoreA, scoreB };
    });

    const claimed = await db.match.updateMany({
      where: {
        id,
        status: 'PENDING',
        playerAId: { not: null },
        playerBId: { not: null },
      },
      data: {
        scoreA: body.scoreA,
        scoreB: body.scoreB,
        status: 'AWAITING_VALIDATION',
        reportedById: reporterId,
      },
    });

    if (claimed.count !== 1) {
      throw new ValidationError('Match is not available for score reporting');
    }

    const updated = await db.match.findUnique({
      where: { id },
      include: {
        playerA: { select: { id: true, name: true } },
        playerB: { select: { id: true, name: true } },
      },
    });
    if (!updated) throw new NotFoundError('Match not found');

    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}
