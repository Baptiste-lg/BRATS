import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, created, handleError, parseBody } from '@/lib/api';
import { requireAuth } from '@/lib/session';
import { generateTournamentCode } from '@/lib/tournament-code';
import { ValidationError } from '@/lib/errors';

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

    const VALID_FORMATS = new Set(['DOUBLE_ELIMINATION', 'SINGLE_ELIMINATION']);

    const body = await parseBody(request, (raw) => {
      const b = raw as Record<string, unknown>;
      if (typeof b['name'] !== 'string' || b['name'].trim().length === 0) {
        throw new ValidationError('name is required');
      }
      const format = (b['format'] as string | undefined) ?? 'DOUBLE_ELIMINATION';
      if (!VALID_FORMATS.has(format)) {
        throw new ValidationError('format must be DOUBLE_ELIMINATION or SINGLE_ELIMINATION');
      }
      return { name: (b['name'] as string).trim(), format };
    });

    // Retry on code collision (extremely unlikely but correct)
    let code: string;
    let attempts = 0;
    do {
      code = generateTournamentCode();
      const existing = await db.tournament.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

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
    return handleError(error);
  }
}
