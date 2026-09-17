import type { PrismaClient } from '@prisma/client';
import { calculateElo } from './calculator';
import { DEFAULT_ELO } from './types';

// =============================================================================
// Elo service — DB operations for updating player ratings
// =============================================================================

/**
 * Updates Elo ratings for the winner and loser of a match.
 * Creates EloRecord entries for both players and updates their global standing.
 *
 * Should be called inside a transaction after a match is validated.
 *
 * @param tx         - Prisma transaction client
 * @param winnerId   - DB Player.id of the winner
 * @param loserId    - DB Player.id of the loser
 * @param tournamentId - Tournament this match belongs to
 */
export async function applyEloUpdate(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  winnerId: string,
  loserId: string,
  tournamentId: string,
): Promise<void> {
  const [winner, loser] = await Promise.all([
    tx.player.findUnique({
      where: { id: winnerId },
      include: {
        eloRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { eloRecords: true } },
      },
    }),
    tx.player.findUnique({
      where: { id: loserId },
      include: {
        eloRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { eloRecords: true } },
      },
    }),
  ]);

  if (!winner || !loser) return;

  // Get current Elo from the last record, or use default
  const winnerCurrentElo = winner.eloRecords[0]?.eloAfter ?? DEFAULT_ELO;
  const loserCurrentElo = loser.eloRecords[0]?.eloAfter ?? DEFAULT_ELO;

  const result = calculateElo({
    winnerElo: winnerCurrentElo,
    loserElo: loserCurrentElo,
    winnerGamesPlayed: winner._count.eloRecords,
    loserGamesPlayed: loser._count.eloRecords,
  });

  await Promise.all([
    tx.eloRecord.create({
      data: {
        playerName: winner.name,
        playerId: winnerId,
        tournamentId,
        eloBefore: winnerCurrentElo,
        eloAfter: result.newWinnerElo,
        delta: result.winnerDelta,
      },
    }),
    tx.eloRecord.create({
      data: {
        playerName: loser.name,
        playerId: loserId,
        tournamentId,
        eloBefore: loserCurrentElo,
        eloAfter: result.newLoserElo,
        delta: result.loserDelta,
      },
    }),
  ]);
}
