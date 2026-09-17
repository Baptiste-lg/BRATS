import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, noContent, handleError, parseBody } from '@/lib/api';
import { requireAuth } from '@/lib/session';
import { NotFoundError, ForbiddenError } from '@/lib/errors';

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/tournaments/[id] — get a tournament by ID (public: code also accepted)
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const tournament = await db.tournament.findUnique({
      where: { id },
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

// PATCH /api/tournaments/[id] — update tournament name or status
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const tournament = await db.tournament.findUnique({ where: { id } });

    if (!tournament) throw new NotFoundError('Tournament not found');
    if (tournament.organizerId !== user.id) throw new ForbiddenError('Not your tournament');

    const body = await parseBody(request, (raw) => {
      const b = raw as Record<string, unknown>;
      return {
        name: typeof b['name'] === 'string' ? b['name'].trim() : undefined,
        status: typeof b['status'] === 'string' ? b['status'] : undefined,
      };
    });

    const updated = await db.tournament.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.status !== undefined && {
          status: body.status as 'DRAFT' | 'LIVE' | 'DONE',
        }),
      },
    });

    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/tournaments/[id] — delete a tournament (cascade deletes players & matches)
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const tournament = await db.tournament.findUnique({ where: { id } });

    if (!tournament) throw new NotFoundError('Tournament not found');
    if (tournament.organizerId !== user.id) throw new ForbiddenError('Not your tournament');

    await db.tournament.delete({ where: { id } });
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}
