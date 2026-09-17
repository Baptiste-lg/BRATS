import type { Bracket, BracketMatch, BracketOptions, BracketPlayer } from './types';
import { generateWinnersBracket } from './winners';
import { generateLosersBracket } from './losers';
import { matchId as makeMatchId } from './utils';
import { resolveAutomaticMatches } from './advance';

// =============================================================================
// Public API — generateBracket
// =============================================================================

/**
 * Generates a complete double-elimination bracket from a list of players.
 *
 * @param players - List of players with unique, positive 1-based seeds.
 * @param options - Optional configuration.
 * @returns A Bracket object containing all matches wired together.
 */
export function generateBracket(players: BracketPlayer[], options: BracketOptions = {}): Bracket {
  const { grandFinalReset = true } = options;

  const playerIds = new Set<string>();
  const seeds = new Set<number>();
  for (const player of players) {
    if (playerIds.has(player.id)) {
      throw new RangeError(`Duplicate player id: ${player.id}`);
    }
    if (!Number.isSafeInteger(player.seed) || player.seed < 1) {
      throw new RangeError(`Invalid seed for player ${player.id}`);
    }
    if (seeds.has(player.seed)) {
      throw new RangeError(`Duplicate seed: ${player.seed}`);
    }
    playerIds.add(player.id);
    seeds.add(player.seed);
  }

  if (players.length === 0) {
    return { players: [], totalRounds: 0, winnersRounds: 0, losersRounds: 0, matches: [] };
  }

  if (players.length === 1) {
    // Edge case: single player, instant winner
    return {
      players,
      totalRounds: 1,
      winnersRounds: 1,
      losersRounds: 0,
      matches: [],
    };
  }

  // --- Winners bracket ---
  const { matches: winnersMatches, rounds: winnersRounds } = generateWinnersBracket(players);

  // --- Losers bracket ---
  const { losersMatches, losersRounds } = generateLosersBracket(winnersMatches, winnersRounds);

  // --- Grand Final ---
  // Winners bracket winner vs. losers bracket winner.
  const grandFinalMatch: BracketMatch = {
    id: makeMatchId('GRAND_FINAL', 1, 1),
    round: 1,
    position: 1,
    side: 'GRAND_FINAL',
    playerA: null, // filled by winners final winner
    playerB: null, // filled by losers final winner
    scoreA: null,
    scoreB: null,
    winnerId: null,
    status: 'PENDING',
    nextMatchId: grandFinalReset ? makeMatchId('GRAND_FINAL', 2, 1) : null,
    nextMatchPosition: null,
    loserMatchId: null,
    loserMatchPosition: null,
  };

  // --- Grand Final Reset (optional) ---
  // If the losers bracket winner beats the winners bracket winner in grand final,
  // they play one more match since the WB winner has never lost.
  const resetMatch: BracketMatch | null = grandFinalReset
    ? {
        id: makeMatchId('GRAND_FINAL', 2, 1),
        round: 2,
        position: 1,
        side: 'GRAND_FINAL',
        playerA: null,
        playerB: null,
        scoreA: null,
        scoreB: null,
        winnerId: null,
        status: 'PENDING',
        nextMatchId: null,
        nextMatchPosition: null,
        loserMatchId: null,
        loserMatchPosition: null,
      }
    : null;

  // Wire winners final → grand final (slot A)
  const winnersFinal = winnersMatches.find((m) => m.round === winnersRounds);
  if (winnersFinal !== undefined) {
    winnersFinal.nextMatchId = grandFinalMatch.id;
    winnersFinal.nextMatchPosition = 'A';
  }

  // Wire losers final → grand final (slot B)
  const losersFinal = losersMatches.reduce<BracketMatch | undefined>(
    (latest, m) => (!latest || m.round > latest.round ? m : latest),
    undefined,
  );
  if (losersFinal !== undefined) {
    losersFinal.nextMatchId = grandFinalMatch.id;
    losersFinal.nextMatchPosition = 'B';
  } else if (winnersFinal !== undefined) {
    // Two-player brackets have no separate losers match. The WB loser gets
    // the second grand-final slot directly.
    winnersFinal.loserMatchId = grandFinalMatch.id;
    winnersFinal.loserMatchPosition = 'B';
  }

  const allMatches: BracketMatch[] = [
    ...winnersMatches,
    ...losersMatches,
    grandFinalMatch,
    ...(resetMatch !== null ? [resetMatch] : []),
  ];

  const totalRounds = winnersRounds + losersRounds + (grandFinalReset ? 2 : 1);

  // Resolve every bye that is structurally known. This is intentionally done
  // after both brackets are wired so bye sentinels can flow through later
  // winners and losers rounds without creating phantom pending matches.
  resolveAutomaticMatches(allMatches);

  return {
    players,
    totalRounds,
    winnersRounds,
    losersRounds,
    matches: allMatches,
  };
}

// Re-export types for convenience
export type { Bracket, BracketMatch, BracketPlayer, BracketOptions } from './types';
export { isBye, isPlayer } from './types';
export { advanceWinner } from './advance';
