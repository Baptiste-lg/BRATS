import type { Bracket, BracketMatch, BracketPlayer } from './types';
import { isPlayer } from './types';

// =============================================================================
// advanceWinner — pure score propagation
//
// Given a bracket and a resolved match ID + winner ID:
// 1. Validates the input.
// 2. Returns a NEW Bracket with the match marked DONE and the winner/loser
//    placed in their respective next matches.
//
// This function is PURE — it never mutates the input bracket.
// =============================================================================

/**
 * Records the result of a match and propagates the winner/loser to their
 * next matches.
 *
 * @param bracket   The current bracket state.
 * @param matchId   The ID of the match that was just resolved.
 * @param winnerId  The BracketPlayer.id of the winning player.
 * @returns A new Bracket with the result applied.
 * @throws  If the match does not exist, is already done, or winnerId is invalid.
 */
export function advanceWinner(
  bracket: Bracket,
  matchId: string,
  winnerId: string,
): Bracket {
  const match = bracket.matches.find((m) => m.id === matchId);

  if (match === undefined) {
    throw new Error(`Match not found: ${matchId}`);
  }

  if (match.status === 'DONE') {
    throw new Error(`Match ${matchId} is already resolved.`);
  }

  // Validate winnerId is actually a player in this match
  const playerA = isPlayer(match.playerA) ? match.playerA : null;
  const playerB = isPlayer(match.playerB) ? match.playerB : null;

  if (playerA?.id !== winnerId && playerB?.id !== winnerId) {
    throw new Error(
      `Player ${winnerId} is not in match ${matchId}. ` +
        `Players: ${playerA?.id ?? 'null'}, ${playerB?.id ?? 'null'}`,
    );
  }

  const winner: BracketPlayer = (playerA?.id === winnerId ? playerA : playerB)!;
  const loser: BracketPlayer | null =
    playerA?.id === winnerId ? playerB : playerA;

  // Deep-clone the matches array to preserve immutability
  const newMatches: BracketMatch[] = bracket.matches.map((m) =>
    m.id === matchId
      ? { ...m, status: 'DONE', winnerId: winner.id }
      : { ...m },
  );

  const matchMap = new Map(newMatches.map((m) => [m.id, m]));

  // Propagate winner to next match
  if (match.nextMatchId !== null && match.nextMatchPosition !== null) {
    const nextMatch = matchMap.get(match.nextMatchId);
    if (nextMatch !== undefined) {
      if (match.nextMatchPosition === 'A') {
        nextMatch.playerA = winner;
      } else {
        nextMatch.playerB = winner;
      }
    }
  }

  // Propagate loser to losers bracket
  if (
    loser !== null &&
    match.loserMatchId !== null &&
    match.loserMatchPosition !== null
  ) {
    const loserMatch = matchMap.get(match.loserMatchId);
    if (loserMatch !== undefined) {
      if (match.loserMatchPosition === 'A') {
        loserMatch.playerA = loser;
      } else {
        loserMatch.playerB = loser;
      }
    }
  }

  return {
    ...bracket,
    matches: newMatches,
  };
}
