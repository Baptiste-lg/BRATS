import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, created, handleError, parseBody } from '@/lib/api';
import { requireAuth } from '@/lib/session';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/tournaments/[id]/players
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const players = await db.player.findMany({
      where: { tournamentId: id },
      orderBy: { seed: 'asc' },
      select: { id: true, name: true, seed: true },
    });
    return ok(players);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/tournaments/[id]/players — add one or more players
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const tournament = await db.tournament.findUnique({ where: { id } });
    if (!tournament) throw new NotFoundError('Tournament not found');
    if (tournament.organizerId !== user.id) throw new ForbiddenError('Not your tournament');
    if (tournament.status !== 'DRAFT') {
      throw new ValidationError('Cannot add players after the bracket is generated');
    }

    const body = await parseBody(request, (raw) => {
      const b = raw as Record<string, unknown>;
      // Accept either a single player or a list
      if (Array.isArray(b['players'])) {
        const players = b['players'] as unknown[];
        if (players.length === 0) throw new ValidationError('At least one player required');
        if (players.length > 256) throw new ValidationError('Maximum 256 players per tournament');
        return players.map((p, i) => {
          const player = p as Record<string, unknown>;
          if (typeof player['name'] !== 'string' || player['name'].trim().length === 0) {
            throw new ValidationError(`Player at index ${i} is missing a name`);
          }
          if ((player['name'] as string).trim().length > 100) {
            throw new ValidationError(`Player at index ${i}: name must be 100 characters or fewer`);
          }
          return { name: (player['name'] as string).trim() };
        });
      }
      if (typeof b['name'] === 'string' && b['name'].trim().length > 0) {
        if (b['name'].trim().length > 100) {
          throw new ValidationError('name must be 100 characters or fewer');
        }
        return [{ name: (b['name'] as string).trim() }];
      }
      throw new ValidationError('Provide either { name } or { players: [...] }');
    });

    // Count inside the transaction to prevent seed collisions under concurrent adds
    const created_ = await db.$transaction(async (tx) => {
      const currentCount = await tx.player.count({ where: { tournamentId: id } });
      return Promise.all(
        body.map((p, i) =>
          tx.player.create({
            data: { tournamentId: id, name: p.name, seed: currentCount + i + 1 },
          }),
        ),
      );
    });

    return created(created_);
  } catch (error) {
    return handleError(error);
  }
}
