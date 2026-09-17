// =============================================================================
// Elo rating system types
// =============================================================================

/** Default starting Elo for a new player. */
export const DEFAULT_ELO = 1000;

/** K-factor: determines how much a single match can change the rating. */
export const K_FACTOR_NEW = 40;    // < 30 games played
export const K_FACTOR_MID = 20;    // 30–100 games
export const K_FACTOR_EST = 10;    // > 100 games (established player)

/** Elo rating (integer). */
export type EloRating = number;

export interface EloInput {
  /** Current Elo rating of the winner. */
  winnerElo: EloRating;
  /** Current Elo rating of the loser. */
  loserElo: EloRating;
  /** Number of tournaments the winner has played. */
  winnerGamesPlayed?: number;
  /** Number of tournaments the loser has played. */
  loserGamesPlayed?: number;
}

export interface EloResult {
  /** New Elo rating for the winner. */
  newWinnerElo: EloRating;
  /** New Elo rating for the loser. */
  newLoserElo: EloRating;
  /** Change in Elo for the winner (positive). */
  winnerDelta: number;
  /** Change in Elo for the loser (negative). */
  loserDelta: number;
}
