import type { EloInput, EloResult, EloRating } from './types';
import { K_FACTOR_EST, K_FACTOR_MID, K_FACTOR_NEW } from './types';

// =============================================================================
// Elo calculator — pure functions, no side effects
// =============================================================================

const MIN_ELO = 100;

/**
 * Returns the expected score (win probability) for a player
 * given their rating and their opponent's rating.
 * Uses the standard FIDE Elo formula.
 */
export function expectedScore(playerElo: EloRating, opponentElo: EloRating): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Returns the K-factor based on the number of validated matches a player has played.
 */
export function getKFactor(gamesPlayed: number): number {
  if (gamesPlayed <= 29) return K_FACTOR_NEW;
  if (gamesPlayed <= 100) return K_FACTOR_MID;
  return K_FACTOR_EST;
}

/**
 * Calculates new Elo ratings after a match result.
 * The winner is assumed to have scored 1, the loser 0.
 *
 * @returns New ratings for both players, and the deltas.
 */
export function calculateElo(input: EloInput): EloResult {
  const { winnerElo, loserElo, winnerGamesPlayed = 0, loserGamesPlayed = 0 } = input;

  const expectedWinner = expectedScore(winnerElo, loserElo);
  const expectedLoser = expectedScore(loserElo, winnerElo);

  const kWinner = getKFactor(winnerGamesPlayed);
  const kLoser = getKFactor(loserGamesPlayed);

  // Winner scored 1 (actual), expected was expectedWinner
  const winnerDelta = Math.round(kWinner * (1 - expectedWinner));
  // Loser scored 0 (actual), expected was expectedLoser
  const loserDelta = Math.round(kLoser * (0 - expectedLoser));

  const newWinnerElo = Math.max(MIN_ELO, winnerElo + winnerDelta);
  const newLoserElo = Math.max(MIN_ELO, loserElo + loserDelta);

  return {
    newWinnerElo,
    newLoserElo,
    // Return the applied deltas, not the theoretical deltas. This keeps the
    // result consistent with the floor applied above and with EloRecord.delta.
    winnerDelta: newWinnerElo - winnerElo,
    loserDelta: newLoserElo - loserElo,
  };
}
