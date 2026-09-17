import type { BracketMatch, BracketPlayer, Slot } from './types';
import { buildSeededSlots, matchId } from './utils';

// =============================================================================
// Winners bracket generator
// =============================================================================

/**
 * Generates all matches for the winners bracket.
 *
 * Round 1 is built from seeded player slots (with byes injected for non-power-of-2 counts).
 * Subsequent rounds are built as empty shells — playerA/playerB will be filled
 * by the advancement logic when results are recorded.
 *
 * Returns the matches array AND the round count for the winners bracket.
 */
export function generateWinnersBracket(players: BracketPlayer[]): {
  matches: BracketMatch[];
  rounds: number;
} {
  if (players.length === 0) {
    return { matches: [], rounds: 0 };
  }

  // --- Round 1: seeded slots ---
  const slots = buildSeededSlots(players);
  const round1Matches: BracketMatch[] = slots.map(([a, b], i) => {
    const position = i + 1;
    return {
      id: matchId('WINNERS', 1, position),
      round: 1,
      position,
      side: 'WINNERS',
      playerA: a,
      playerB: b,
      scoreA: null,
      scoreB: null,
      winnerId: null,
      status: 'PENDING',
      nextMatchId: null, // filled below
      nextMatchPosition: null,
      loserMatchId: null, // filled by losers bracket generator
      loserMatchPosition: null,
    };
  });

  // --- Build subsequent rounds ---
  const allMatches: BracketMatch[] = [...round1Matches];
  let currentRound = round1Matches;
  let roundNum = 2;

  while (currentRound.length > 1) {
    const nextRoundSize = Math.ceil(currentRound.length / 2);
    const nextRound: BracketMatch[] = [];

    for (let i = 0; i < nextRoundSize; i++) {
      const position = i + 1;
      const m = {
        id: matchId('WINNERS', roundNum, position),
        round: roundNum,
        position,
        side: 'WINNERS' as const,
        playerA: null as Slot | null,
        playerB: null as Slot | null,
        scoreA: null,
        scoreB: null,
        winnerId: null,
        status: 'PENDING' as const,
        nextMatchId: null,
        nextMatchPosition: null,
        loserMatchId: null,
        loserMatchPosition: null,
      };
      nextRound.push(m);
      allMatches.push(m);
    }

    // Wire up next-match links from current round to next round
    for (let i = 0; i < currentRound.length; i++) {
      const match = currentRound[i]!;
      const nextMatch = nextRound[Math.floor(i / 2)]!;
      match.nextMatchId = nextMatch.id;
      match.nextMatchPosition = i % 2 === 0 ? 'A' : 'B';
    }

    currentRound = nextRound;
    roundNum++;
  }

  // The winners final (last match) does NOT have a nextMatchId within the winners
  // bracket — it feeds the grand final. That linkage is set at the top level.
  const rounds = roundNum - 1;
  return { matches: allMatches, rounds };
}
