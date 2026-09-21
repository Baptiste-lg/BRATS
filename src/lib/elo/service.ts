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
    tx.player.findUnique({ where: { id: winnerId } }),
    tx.player.findUnique({ where: { id: loserId } }),
  ]);

  if (!winner || !loser) {
    throw new Error('Cannot update Elo for a match with a missing player');
  }

  // Elo history is global by player name, so two matches involving the same
  // name must not read the same rating before either one writes its record.
  // PostgreSQL transaction advisory locks keep this small critical section
  // serialized without adding a separate global-rating table.
  const lockNames = [winner.name, loser.name].sort();
  for (const playerName of lockNames) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${playerName}, 0))`;
  }

  // Player IDs are tournament-scoped. EloRecord.playerName is the global
  // identity used by this application, so history must be read by name rather
  // than by the current tournament's Player.id.
  const [winnerLatest, loserLatest, winnerGames, loserGames] = await Promise.all([
    tx.eloRecord.findFirst({
      where: { playerName: winner.name },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
    tx.eloRecord.findFirst({
      where: { playerName: loser.name },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
    tx.eloRecord.count({ where: { playerName: winner.name } }),
    tx.eloRecord.count({ where: { playerName: loser.name } }),
  ]);

  // Get current Elo from the last record, or use default
  const winnerCurrentElo = winnerLatest?.eloAfter ?? DEFAULT_ELO;
  const loserCurrentElo = loserLatest?.eloAfter ?? DEFAULT_ELO;

  const result = calculateElo({
    winnerElo: winnerCurrentElo,
    loserElo: loserCurrentElo,
    winnerGamesPlayed: winnerGames,
    loserGamesPlayed: loserGames,
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
