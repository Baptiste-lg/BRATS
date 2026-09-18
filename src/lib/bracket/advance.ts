import type { Bracket, BracketMatch, BracketPlayer, Slot } from './types';
import { isPlayer } from './types';
import { makeBye } from './utils';

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
export function advanceWinner(bracket: Bracket, matchId: string, winnerId: string): Bracket {
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

  if (playerA === null || playerB === null) {
    throw new Error(`Match ${matchId} is not ready for a real result.`);
  }

  if (playerA.id !== winnerId && playerB.id !== winnerId) {
    throw new Error(
      `Player ${winnerId} is not in match ${matchId}. Players: ${playerA.id}, ${playerB.id}`,
    );
  }

  const winner: BracketPlayer = playerA.id === winnerId ? playerA : playerB;
  const loser: BracketPlayer = playerA.id === winnerId ? playerB : playerA;

  // Deep-clone the matches array to preserve immutability
  const newMatches: BracketMatch[] = bracket.matches.map((m) =>
    m.id === matchId ? { ...m, status: 'DONE', winnerId: winner.id } : { ...m },
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
  if (match.loserMatchId !== null && match.loserMatchPosition !== null) {
    const loserMatch = matchMap.get(match.loserMatchId);
    if (loserMatch !== undefined) {
      if (match.loserMatchPosition === 'A') {
        loserMatch.playerA = loser;
      } else {
        loserMatch.playerB = loser;
      }
    }
  }

  // Grand Final 1 has a conditional reset that the normal nextMatchPosition
  // field cannot represent. Branch on who wins.
  if (match.side === 'GRAND_FINAL' && match.round === 1 && match.nextMatchId !== null) {
    const resetMatch = matchMap.get(match.nextMatchId);
    if (resetMatch !== undefined) {
      if (winner.id === playerB.id) {
        // LB champion upset the WB champion: activate the reset
        resetMatch.playerA = playerA;
        resetMatch.playerB = playerB;
      } else {
        // WB champion wins cleanly: reset is never played
        resetMatch.status = 'DONE';
      }
    }
  }

  resolveAutomaticMatches(newMatches);

  return {
    ...bracket,
    matches: newMatches,
  };
}

/**
 * Resolves matches whose two incoming slots are known and at least one slot is
 * a bye. A null slot still means "waiting for a previous match" and must not
 * be treated as a bye.
 *
 * This is used both during generation and after a real result is advanced,
 * because a reported loser can complete a previously waiting bye match.
 */
export function resolveAutomaticMatches(matches: BracketMatch[]): void {
  let changed = true;

  while (changed) {
    changed = false;
    const matchMap = new Map(matches.map((match) => [match.id, match]));

    for (const match of matches) {
      if (match.status === 'DONE' || match.playerA === null || match.playerB === null) {
        continue;
      }

      const playerA = isPlayer(match.playerA) ? match.playerA : null;
      const playerB = isPlayer(match.playerB) ? match.playerB : null;

      // Real matches remain pending for advanceWinner().
      if (playerA !== null && playerB !== null) {
        continue;
      }

      const winner: Slot = playerA ?? playerB ?? makeBye();
      match.status = 'DONE';
      match.winnerId = isPlayer(winner) ? winner.id : null;
      changed = true;

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

      // An automatic bye also contributes an empty loser slot. Without this
      // propagation, non-power-of-two brackets leave phantom losers matches
      // waiting forever for players who never existed.
      if (match.loserMatchId !== null && match.loserMatchPosition !== null) {
        const loserMatch = matchMap.get(match.loserMatchId);
        if (loserMatch !== undefined) {
          if (match.loserMatchPosition === 'A') {
            loserMatch.playerA = makeBye();
          } else {
            loserMatch.playerB = makeBye();
          }
        }
      }
    }
  }
}
