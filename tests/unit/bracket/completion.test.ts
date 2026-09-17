import { describe, expect, it } from 'vitest';
import { advanceWinner, generateBracket, isPlayer } from '@/lib/bracket';
import type { Bracket, BracketPlayer } from '@/lib/bracket/types';

function makePlayers(count: number): BracketPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    seed: i + 1,
  }));
}

function advanceFirstReady(bracket: Bracket): Bracket {
  let current = bracket;

  while (true) {
    const match = current.matches.find(
      (candidate) =>
        candidate.status === 'PENDING' &&
        isPlayer(candidate.playerA) &&
        isPlayer(candidate.playerB),
    );

    if (match === undefined) return current;
    if (!isPlayer(match.playerA)) throw new Error('Expected a real player in slot A');
    current = advanceWinner(current, match.id, match.playerA.id);
  }
}

function advanceUntilGrandFinalReady(bracket: Bracket): Bracket {
  let current = bracket;

  while (true) {
    const match = current.matches.find(
      (candidate) =>
        candidate.side !== 'GRAND_FINAL' &&
        candidate.status === 'PENDING' &&
        isPlayer(candidate.playerA) &&
        isPlayer(candidate.playerB),
    );

    if (match === undefined) return current;
    if (!isPlayer(match.playerA)) throw new Error('Expected a real player in slot A');
    current = advanceWinner(current, match.id, match.playerA.id);
  }
}

describe('bracket completion invariants', () => {
  it.each([2, 3, 4, 5, 6, 7, 8])(
    '%i-player brackets have no blocked match after all real matches are advanced',
    (playerCount) => {
      const bracket = advanceFirstReady(generateBracket(makePlayers(playerCount)));
      const pending = bracket.matches.filter((match) => match.status === 'PENDING');

      expect(pending).toHaveLength(1);
      expect(pending[0]?.id).toBe('GRAND_FINAL-R2-P1');
      expect(pending[0]?.playerA).toBeNull();
      expect(pending[0]?.playerB).toBeNull();
    },
  );

  it('activates the grand-final reset only when the losers champion wins GF1', () => {
    const afterBracket = advanceUntilGrandFinalReady(generateBracket(makePlayers(8)));
    const grandFinal = afterBracket.matches.find((match) => match.id === 'GRAND_FINAL-R1-P1');
    expect(grandFinal?.status).toBe('PENDING');
    expect(isPlayer(grandFinal?.playerA)).toBe(true);
    expect(isPlayer(grandFinal?.playerB)).toBe(true);

    const losersChampion = grandFinal?.playerB as BracketPlayer;
    const withReset = advanceWinner(afterBracket, grandFinal!.id, losersChampion.id);
    const reset = withReset.matches.find((match) => match.id === 'GRAND_FINAL-R2-P1');

    expect(reset?.status).toBe('PENDING');
    expect(isPlayer(reset?.playerA)).toBe(true);
    expect(isPlayer(reset?.playerB)).toBe(true);
    expect((reset?.playerA as BracketPlayer).id).toBe((grandFinal?.playerA as BracketPlayer).id);
    expect((reset?.playerB as BracketPlayer).id).toBe(losersChampion.id);

    const completed = advanceWinner(withReset, reset!.id, losersChampion.id);
    expect(completed.matches.find((match) => match.id === reset!.id)?.status).toBe('DONE');
  });

  it('finishes without a pending reset when reset matches are disabled', () => {
    const bracket = advanceUntilGrandFinalReady(
      generateBracket(makePlayers(8), { grandFinalReset: false }),
    );
    const pending = bracket.matches.filter((match) => match.status === 'PENDING');

    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe('GRAND_FINAL-R1-P1');
    expect(isPlayer(pending[0]?.playerA)).toBe(true);
    expect(isPlayer(pending[0]?.playerB)).toBe(true);

    const completed = advanceWinner(
      bracket,
      pending[0]!.id,
      (pending[0]!.playerA as BracketPlayer).id,
    );

    expect(completed.matches.every((match) => match.status === 'DONE')).toBe(true);
  });
});
