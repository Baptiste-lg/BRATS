import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/leaderboard — global Elo rankings
// Returns the latest Elo rating per player name, sorted descending.
export async function GET() {
  try {
    // Keep the expensive deduplication in PostgreSQL instead of loading the
    // complete Elo history into the application process.
    const records = await db.$queryRaw<{ playerName: string; eloAfter: number; delta: number }[]>`
      SELECT DISTINCT ON ("playerName")
        "playerName", "eloAfter", "delta"
      FROM "EloRecord"
      ORDER BY "playerName", "createdAt" DESC, "id" DESC
    `;

    const leaderboard = [...records]
      .sort((a, b) => b.eloAfter - a.eloAfter)
      .map((entry, i) => ({ rank: i + 1, ...entry }));

    return NextResponse.json({ data: leaderboard });
  } catch (error) {
    return handleError(error);
  }
}
