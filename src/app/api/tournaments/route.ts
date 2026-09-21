import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, created, handleError, parseBody } from '@/lib/api';
import { requireAuth } from '@/lib/session';
import { generateTournamentCode } from '@/lib/tournament-code';
import { ValidationError } from '@/lib/errors';

// The bracket engine currently implements double elimination only. Keep the
// database enum ready for the future, but never create a tournament that the
// API cannot actually generate.
const SUPPORTED_FORMAT = 'DOUBLE_ELIMINATION';
const MAX_CODE_ATTEMPTS = 5;

function isUniqueConstraintError(error: unknown): boolean {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';
}

// GET /api/tournaments — list tournaments for the authenticated organizer
export async function GET() {
  try {
    const user = await requireAuth();
    const tournaments = await db.tournament.findMany({
      where: { organizerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { players: true, matches: true } },
      },
    });
    return ok(tournaments);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/tournaments — create a new tournament
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await parseBody(request, (raw) => {
      const b = raw as Record<string, unknown>;
      if (typeof b['name'] !== 'string' || b['name'].trim().length === 0) {
        throw new ValidationError('name is required');
      }
      if (b['name'].trim().length > 100) {
        throw new ValidationError('name must be 100 characters or fewer');
      }
      const format = (b['format'] as string | undefined) ?? SUPPORTED_FORMAT;
      if (format !== SUPPORTED_FORMAT) {
        throw new ValidationError('Only DOUBLE_ELIMINATION is currently supported');
      }
      return { name: (b['name'] as string).trim(), format };
    });

    // The unique constraint is the authority: a read-before-write check alone
    // still races when two organizers generate the same code concurrently.
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = generateTournamentCode();
      try {
        const tournament = await db.tournament.create({
          data: {
            code,
            name: body.name,
            format: body.format as 'DOUBLE_ELIMINATION' | 'SINGLE_ELIMINATION',
            organizerId: user.id,
          },
        });

        return created(tournament);
      } catch (error) {
        if (!isUniqueConstraintError(error) || attempt === MAX_CODE_ATTEMPTS - 1) {
          throw error;
        }
      }
    }

    throw new ValidationError('Could not allocate a unique tournament code');
  } catch (error) {
    return handleError(error);
  }
}
