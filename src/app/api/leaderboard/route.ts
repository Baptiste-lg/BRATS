import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/leaderboard — global Elo rankings
// Returns the latest Elo rating per player name, sorted descending.
export async function GET() {
  try {
    // Aggregate latest EloRecord per playerName
    const records = await db.eloRecord.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Keep only the most recent record per player name
    const seen = new Map<string, { playerName: string; eloAfter: number; delta: number }>();
    for (const r of records) {
      if (!seen.has(r.playerName)) {
        seen.set(r.playerName, {
          playerName: r.playerName,
          eloAfter: r.eloAfter,
          delta: r.delta,
        });
      }
    }

    const leaderboard = Array.from(seen.values())
      .sort((a, b) => b.eloAfter - a.eloAfter)
      .map((entry, i) => ({ rank: i + 1, ...entry }));

    return NextResponse.json({ data: leaderboard });
  } catch (error) {
    return handleError(error);
  }
}
