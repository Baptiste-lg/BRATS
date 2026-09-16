import type { BracketMatch } from './types';
import { matchId } from './utils';

// =============================================================================
// Losers bracket generator
// =============================================================================

/**
 * Generates the losers bracket shell for a double-elimination tournament.
 *
 * The losers bracket structure:
 * - After round R of the winners bracket, losers drop into the losers bracket.
 * - Losers bracket has (2 * winnersRounds - 2) rounds total.
 * - Odd-numbered losers rounds receive losers from winners (no prior loser faces another loser yet).
 * - Even-numbered losers rounds are "consolidation" rounds (loser vs loser).
 *
 * For N winners rounds:
 *   - Losers bracket rounds: 2*(winnersRounds-1)
 *   - Round 1 losers: from winners round 1 (size/2 matches)
 *   - Round 2 losers: winners round 1 losers vs each other (size/4 matches)
 *   - Round 3 losers: + winners round 2 losers (size/4 matches)
 *   - ...etc.
 *
 * Returns:
 *   - losers bracket matches (empty shells)
 *   - the losers bracket round count
 *   - a map from winners match ID → losers match they feed into
 */
export function generateLosersBracket(
  winnersMatches: BracketMatch[],
  winnersRounds: number,
): {
  losersMatches: BracketMatch[];
  losersRounds: number;
  feedMap: Map<string, { matchId: string; position: 'A' | 'B' }>;
} {
  if (winnersRounds === 0) {
    return { losersMatches: [], losersRounds: 0, feedMap: new Map() };
  }

  const feedMap = new Map<string, { matchId: string; position: 'A' | 'B' }>();
  const allLosersMatches: BracketMatch[] = [];

  // Build losers rounds structure
  // Each winners round (except the final) feeds losers.
  // Losers bracket has 2*(winnersRounds-1) rounds.

  const losersRounds = Math.max(1, 2 * (winnersRounds - 1));

  // Track the "live" matches in the losers bracket round by round
  let prevLosersRound: BracketMatch[] = [];

  for (let wr = 1; wr < winnersRounds; wr++) {
    const winnersRoundMatches = winnersMatches.filter((m) => m.round === wr);

    // --- Drop-in round (odd losers rounds: 1, 3, 5 ...) ---
    const dropInRoundNum = 2 * wr - 1;
    const dropCount = winnersRoundMatches.length;

    // If this is the first losers round, dropIns become the round directly.
    // Otherwise, they are matched against the survivors from the previous losers round.
    const dropInMatches: BracketMatch[] = [];

    if (prevLosersRound.length === 0) {
      // First losers round: one match per winners-round-1 loser pair
      for (let i = 0; i < Math.ceil(dropCount / 2); i++) {
        const position = i + 1;
        const m = makeLosersMatch(dropInRoundNum, position);
        dropInMatches.push(m);
        allLosersMatches.push(m);
      }

      // Wire winners round 1 losers → losers round 1 matches
      for (let i = 0; i < winnersRoundMatches.length; i++) {
        const wm = winnersRoundMatches[i]!;
        const lm = dropInMatches[Math.floor(i / 2)]!;
        const pos: 'A' | 'B' = i % 2 === 0 ? 'A' : 'B';
        wm.loserMatchId = lm.id;
        wm.loserMatchPosition = pos;
        feedMap.set(wm.id, { matchId: lm.id, position: pos });
      }
    } else {
      // Drop-in round: winners-bracket losers meet the survivors from the previous round.
      // prevLosersRound.length should equal winnersRoundMatches.length
      for (let i = 0; i < prevLosersRound.length; i++) {
        const position = i + 1;
        const m = makeLosersMatch(dropInRoundNum, position);
        dropInMatches.push(m);
        allLosersMatches.push(m);

        // Wire previous losers round winner → this match (slot A)
        const prevMatch = prevLosersRound[i]!;
        prevMatch.nextMatchId = m.id;
        prevMatch.nextMatchPosition = 'A';

        // Wire winners round loser → this match (slot B)
        const wm = winnersRoundMatches[i];
        if (wm !== undefined) {
          wm.loserMatchId = m.id;
          wm.loserMatchPosition = 'B';
          feedMap.set(wm.id, { matchId: m.id, position: 'B' });
        }
      }
    }

    // --- Consolidation round (even losers rounds: 2, 4, 6 ...) ---
    if (dropInMatches.length > 1) {
      const consRoundNum = 2 * wr;
      const consMatches: BracketMatch[] = [];

      for (let i = 0; i < Math.ceil(dropInMatches.length / 2); i++) {
        const position = i + 1;
        const m = makeLosersMatch(consRoundNum, position);
        consMatches.push(m);
        allLosersMatches.push(m);

        // Wire drop-in matches to consolidation
        const ma = dropInMatches[i * 2]!;
        const mb = dropInMatches[i * 2 + 1];

        ma.nextMatchId = m.id;
        ma.nextMatchPosition = 'A';
        if (mb !== undefined) {
          mb.nextMatchId = m.id;
          mb.nextMatchPosition = 'B';
        }
      }

      prevLosersRound = consMatches;
    } else {
      prevLosersRound = dropInMatches;
    }
  }

  // The last losers round feeds the grand final (wired at top level)
  return { losersMatches: allLosersMatches, losersRounds, feedMap };
}

function makeLosersMatch(round: number, position: number): BracketMatch {
  return {
    id: matchId('LOSERS', round, position),
    round,
    position,
    side: 'LOSERS',
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
  };
}
