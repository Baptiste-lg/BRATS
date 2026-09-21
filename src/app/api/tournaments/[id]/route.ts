import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, noContent, handleError, parseBody } from '@/lib/api';
import { requireAuth } from '@/lib/session';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';

const VALID_STATUSES = new Set(['DRAFT', 'LIVE', 'DONE']);

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/tournaments/[id] — get an organizer's tournament by ID
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const tournament = await db.tournament.findUnique({
      where: { id, organizerId: user.id },
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
    const body = await parseBody(request, (raw) => {
      const b = raw as Record<string, unknown>;
      const status = typeof b['status'] === 'string' ? b['status'] : undefined;
      if (status !== undefined && !VALID_STATUSES.has(status)) {
        throw new ValidationError('status must be DRAFT, LIVE, or DONE');
      }
      const name = typeof b['name'] === 'string' ? b['name'].trim() : undefined;
      if (name !== undefined && name.length === 0) {
        throw new ValidationError('name cannot be empty');
      }
      if (name !== undefined && name.length > 100) {
        throw new ValidationError('name must be 100 characters or fewer');
      }
      return {
        name,
        status,
      };
    });

    if (body.name === undefined && body.status === undefined) {
      throw new ValidationError('Provide a name or status to update');
    }

    const updated = await db.$transaction(async (tx) => {
      // Serialize status checks with bracket generation and player imports.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "Tournament"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      if (locked.length === 0) throw new NotFoundError('Tournament not found');

      const tournament = await tx.tournament.findUnique({
        where: { id },
        include: { matches: { select: { status: true } } },
      });
      if (!tournament) throw new NotFoundError('Tournament not found');
      if (tournament.organizerId !== user.id) throw new ForbiddenError('Not your tournament');

      if (body.status !== undefined && body.status !== tournament.status) {
        const hasMatches = tournament.matches.length > 0;
        const allMatchesDone =
          hasMatches && tournament.matches.every((match) => match.status === 'DONE');

        const validTransition =
          (tournament.status === 'DRAFT' && body.status === 'LIVE' && hasMatches) ||
          (tournament.status === 'LIVE' && body.status === 'DONE' && allMatchesDone);

        if (!validTransition) {
          throw new ValidationError(
            'Invalid tournament status transition; generate the bracket or resolve all matches first',
          );
        }
      }

      return tx.tournament.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.status !== undefined && {
            status: body.status as 'DRAFT' | 'LIVE' | 'DONE',
          }),
        },
      });
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
