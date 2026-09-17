// =============================================================================
// Bracket Engine — Pure TypeScript types
// No database, no HTTP. Input: player list → Output: bracket tree.
// =============================================================================

export type BracketSide = 'WINNERS' | 'LOSERS' | 'GRAND_FINAL';

export type MatchStatus = 'PENDING' | 'DONE';

/**
 * A player as known to the bracket engine.
 * `id` is opaque — the caller decides what it is (could be a DB id or a name).
 */
export interface BracketPlayer {
  id: string;
  name: string;
  seed: number; // 1-based, lower = better
}

/**
 * A bye slot — represents an empty seat in the bracket.
 * When a player faces a bye, they automatically advance.
 */
export interface Bye {
  readonly isBye: true;
}

export type Slot = BracketPlayer | Bye;

export function isBye(slot: Slot | null | undefined): slot is Bye {
  return slot != null && 'isBye' in slot && slot.isBye === true;
}

export function isPlayer(slot: Slot | null | undefined): slot is BracketPlayer {
  return slot != null && !('isBye' in slot);
}

/**
 * A single match in the bracket.
 *
 * - `playerA` / `playerB`: may be null (not yet determined) or a Bye.
 * - `winnerId`: populated after the match is resolved.
 * - `nextMatchId` / `nextMatchPosition`: where the winner advances.
 * - `loserMatchId` / `loserMatchPosition`: where the loser drops (double-elim).
 */
export interface BracketMatch {
  id: string; // Stable identifier: `{side}-R{round}-P{position}`
  round: number; // 1-based round number within the bracket side
  position: number; // 1-based position within the round
  side: BracketSide;
  playerA: Slot | null;
  playerB: Slot | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null; // BracketPlayer.id of the winner
  status: MatchStatus;
  nextMatchId: string | null; // Where winner goes
  nextMatchPosition: 'A' | 'B' | null; // Which slot in the next match
  loserMatchId: string | null; // Where loser drops (double-elim only)
  loserMatchPosition: 'A' | 'B' | null;
}

/**
 * The full bracket structure returned by generateBracket().
 */
export interface Bracket {
  players: BracketPlayer[];
  /**
   * Total number of rounds including losers bracket and grand final.
   * Useful for layout calculations.
   */
  totalRounds: number;
  winnersRounds: number;
  losersRounds: number;
  matches: BracketMatch[];
}

/**
 * Options for bracket generation.
 */
export interface BracketOptions {
  /** Include grand final bracket reset match. Default: true */
  grandFinalReset?: boolean;
}
