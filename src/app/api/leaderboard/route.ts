import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/leaderboard — global Elo rankings
// Returns the latest Elo rating per player name, sorted descending.
export async function GET() {
  try {
    // One record per playerName: latest by createdAt (DISTINCT ON in Postgres)
    const records = await db.eloRecord.findMany({
      distinct: ['playerName'],
      orderBy: { createdAt: 'desc' },
      select: { playerName: true, eloAfter: true, delta: true },
    });

    const leaderboard = [...records]
      .sort((a, b) => b.eloAfter - a.eloAfter)
      .map((entry, i) => ({ rank: i + 1, ...entry }));

    return NextResponse.json({ data: leaderboard });
  } catch (error) {
    return handleError(error);
  }
}
