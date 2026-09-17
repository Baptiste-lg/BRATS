import type { BracketMatch } from './types';
import { matchId } from './utils';

// =============================================================================
// Losers bracket generator — double-elimination structure
//
// Algorithm:
//   lb_survivors = []
//   for each winners round:
//     wb_losers = matches from that winners round
//     if lb_survivors is empty:
//       pair wb_losers -> new LB "drop-in" round
//     else:
//       while lb_survivors.length > wb_losers.length:
//         pair lb_survivors -> consolidation round
//       merge lb_survivors 1:1 with wb_losers -> new LB "merge" round
//   while lb_survivors.length > 1:
//     pair lb_survivors -> final consolidation
//   lb_survivors[0] = losers finalist -> feeds grand final
// =============================================================================

export function generateLosersBracket(
  winnersMatches: BracketMatch[],
  winnersRounds: number,
): {
  losersMatches: BracketMatch[];
  losersRounds: number;
} {
  if (winnersRounds <= 1) {
    // With two players the WB loser goes directly to the grand final.
    return { losersMatches: [], losersRounds: 0 };
  }

  const allLosersMatches: BracketMatch[] = [];
  let currentLbRound = 0; // will be incremented before each new LB round

  // Current survivors in the losers bracket (the matches whose winners are still alive)
  let lbSurvivors: BracketMatch[] = [];

  // Process every winners round. The winners-final loser must enter the last
  // losers round before the losers champion reaches the grand final.
  for (let wr = 1; wr <= winnersRounds; wr++) {
    const wbLosers = winnersMatches.filter((m) => m.round === wr);

    if (lbSurvivors.length === 0) {
      // First LB round: pair the WB losers among themselves
      currentLbRound++;
      lbSurvivors = pairDropIns(wbLosers, currentLbRound, allLosersMatches);
    } else {
      // Consolidate lb survivors until their count matches the incoming WB losers count
      while (lbSurvivors.length > wbLosers.length) {
        currentLbRound++;
        lbSurvivors = consolidate(lbSurvivors, currentLbRound, allLosersMatches);
      }

      // Merge 1:1: each lb survivor faces a new WB loser
      currentLbRound++;
      lbSurvivors = merge(lbSurvivors, wbLosers, currentLbRound, allLosersMatches);
    }
  }

  // Final consolidation until 1 survivor remains (= losers finalist)
  while (lbSurvivors.length > 1) {
    currentLbRound++;
    lbSurvivors = consolidate(lbSurvivors, currentLbRound, allLosersMatches);
  }

  return {
    losersMatches: allLosersMatches,
    losersRounds: currentLbRound,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pairs winners-bracket losers into a new LB round (first drop-in). */
function pairDropIns(
  wbMatches: BracketMatch[],
  lbRound: number,
  allMatches: BracketMatch[],
): BracketMatch[] {
  const newMatches: BracketMatch[] = [];
  for (let i = 0; i < wbMatches.length; i += 2) {
    const position = Math.floor(i / 2) + 1;
    const m = makeLosersMatch(lbRound, position);
    newMatches.push(m);
    allMatches.push(m);

    const wma = wbMatches[i]!;
    wma.loserMatchId = m.id;
    wma.loserMatchPosition = 'A';

    const wmb = wbMatches[i + 1];
    if (wmb !== undefined) {
      wmb.loserMatchId = m.id;
      wmb.loserMatchPosition = 'B';
    }
  }
  return newMatches;
}

/** Pairs LB survivors against each other (consolidation round). */
function consolidate(
  survivors: BracketMatch[],
  lbRound: number,
  allMatches: BracketMatch[],
): BracketMatch[] {
  const newMatches: BracketMatch[] = [];
  for (let i = 0; i < survivors.length; i += 2) {
    const position = Math.floor(i / 2) + 1;
    const m = makeLosersMatch(lbRound, position);
    newMatches.push(m);
    allMatches.push(m);

    const sa = survivors[i]!;
    sa.nextMatchId = m.id;
    sa.nextMatchPosition = 'A';

    const sb = survivors[i + 1];
    if (sb !== undefined) {
      sb.nextMatchId = m.id;
      sb.nextMatchPosition = 'B';
    }
  }
  return newMatches;
}

/** Merges LB survivors 1:1 with incoming WB losers (merge round). */
function merge(
  survivors: BracketMatch[],
  wbMatches: BracketMatch[],
  lbRound: number,
  allMatches: BracketMatch[],
): BracketMatch[] {
  const newMatches: BracketMatch[] = [];
  if (survivors.length !== wbMatches.length) {
    throw new Error(
      `Cannot merge losers bracket rounds with ${survivors.length} survivors and ` +
        `${wbMatches.length} winners-bracket losers.`,
    );
  }

  for (let i = 0; i < wbMatches.length; i++) {
    const position = i + 1;
    const m = makeLosersMatch(lbRound, position);
    newMatches.push(m);
    allMatches.push(m);

    // LB survivor fills slot A
    const surv = survivors[i]!;
    surv.nextMatchId = m.id;
    surv.nextMatchPosition = 'A';

    // WB loser fills slot B
    const wm = wbMatches[i]!;
    wm.loserMatchId = m.id;
    wm.loserMatchPosition = 'B';
  }
  return newMatches;
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
