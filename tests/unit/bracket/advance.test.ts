import { describe, it, expect } from 'vitest';
import { generateBracket } from '@/lib/bracket';
import { advanceWinner } from '@/lib/bracket/advance';
import type { BracketPlayer } from '@/lib/bracket/types';
import { isPlayer } from '@/lib/bracket/types';

function makePlayers(count: number): BracketPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    seed: i + 1,
  }));
}

// =============================================================================
// advanceWinner — score propagation
// =============================================================================
describe('advanceWinner', () => {
  describe('winners bracket advancement (8 players)', () => {
    it('winner of WR1 match advances to the correct WR2 slot', () => {
      const players = makePlayers(8);
      const bracket = generateBracket(players);

      const wr1Match = bracket.matches.find(
        (m) => m.side === 'WINNERS' && m.round === 1 && m.position === 1,
      )!;

      const playerA = wr1Match.playerA;
      expect(isPlayer(playerA)).toBe(true);

      const updated = advanceWinner(bracket, wr1Match.id, (playerA as BracketPlayer).id);

      // WR1-P1 winner should advance to WR2-P1 slot A
      const wr2p1 = updated.matches.find((m) => m.id === wr1Match.nextMatchId)!;
      expect(wr2p1).toBeDefined();
      const advancedSlot = wr1Match.nextMatchPosition === 'A' ? wr2p1.playerA : wr2p1.playerB;
      expect(isPlayer(advancedSlot)).toBe(true);
      expect((advancedSlot as BracketPlayer).id).toBe((playerA as BracketPlayer).id);
    });

    it('match status becomes DONE after advancing', () => {
      const players = makePlayers(8);
      const bracket = generateBracket(players);
      const wr1Match = bracket.matches.find(
        (m) => m.side === 'WINNERS' && m.round === 1 && m.position === 1,
      )!;
      const winner = isPlayer(wr1Match.playerA)
        ? wr1Match.playerA
        : (wr1Match.playerB as BracketPlayer);

      const updated = advanceWinner(bracket, wr1Match.id, winner.id);
      const resolvedMatch = updated.matches.find((m) => m.id === wr1Match.id)!;
      expect(resolvedMatch.status).toBe('DONE');
      expect(resolvedMatch.winnerId).toBe(winner.id);
    });

    it('loser of WR1 match drops to the losers bracket', () => {
      const players = makePlayers(8);
      const bracket = generateBracket(players);
      const wr1Match = bracket.matches.find(
        (m) => m.side === 'WINNERS' && m.round === 1 && m.position === 1,
      )!;

      expect(isPlayer(wr1Match.playerA)).toBe(true);
      expect(isPlayer(wr1Match.playerB)).toBe(true);

      const winner = wr1Match.playerA as BracketPlayer;
      const loser = wr1Match.playerB as BracketPlayer;

      const updated = advanceWinner(bracket, wr1Match.id, winner.id);

      // Loser should appear in the losers bracket match
      const lbMatch = updated.matches.find((m) => m.id === wr1Match.loserMatchId)!;
      expect(lbMatch).toBeDefined();

      const loserSlot = wr1Match.loserMatchPosition === 'A' ? lbMatch.playerA : lbMatch.playerB;
      expect(isPlayer(loserSlot)).toBe(true);
      expect((loserSlot as BracketPlayer).id).toBe(loser.id);
    });
  });

  describe('invalid advances', () => {
    it('throws if winnerId is not a player in the match', () => {
      const bracket = generateBracket(makePlayers(8));
      const match = bracket.matches.find(
        (m) => m.side === 'WINNERS' && m.round === 1 && m.position === 1,
      )!;
      expect(() => advanceWinner(bracket, match.id, 'nonexistent-id')).toThrow();
    });

    it('throws if matchId does not exist', () => {
      const bracket = generateBracket(makePlayers(8));
      expect(() => advanceWinner(bracket, 'FAKE-ID', 'p1')).toThrow();
    });

    it('throws if match is already DONE', () => {
      const bracket = generateBracket(makePlayers(8));
      const match = bracket.matches.find(
        (m) => m.side === 'WINNERS' && m.round === 1 && m.position === 1,
      )!;
      const winner = match.playerA as BracketPlayer;
      const after = advanceWinner(bracket, match.id, winner.id);
      // Trying to advance the same match again should throw
      expect(() => advanceWinner(after, match.id, winner.id)).toThrow();
    });
  });

  describe('grand final reset', () => {
    function playAllUntilGF1(players: BracketPlayer[]) {
      let b = generateBracket(players);
      // Advance every non-GF match by always picking slot A as winner
      let changed = true;
      while (changed) {
        changed = false;
        const pending = b.matches.find(
          (m) => m.side !== 'GRAND_FINAL' && m.status === 'PENDING' && isPlayer(m.playerA) && isPlayer(m.playerB),
        );
        if (pending) {
          b = advanceWinner(b, pending.id, (pending.playerA as BracketPlayer).id);
          changed = true;
        }
      }
      return b;
    }

    it('reset match is DONE when WB champion wins GF1', () => {
      const players = makePlayers(4);
      let b = playAllUntilGF1(players);
      const gf1 = b.matches.find((m) => m.side === 'GRAND_FINAL' && m.round === 1)!;
      expect(isPlayer(gf1.playerA)).toBe(true);
      expect(isPlayer(gf1.playerB)).toBe(true);

      // WB champion is slot A — they win
      const wbChampion = gf1.playerA as BracketPlayer;
      b = advanceWinner(b, gf1.id, wbChampion.id);

      const reset = b.matches.find((m) => m.side === 'GRAND_FINAL' && m.round === 2);
      expect(reset).toBeDefined();
      expect(reset!.status).toBe('DONE');
    });

    it('reset match is PENDING with both players when LB champion wins GF1', () => {
      const players = makePlayers(4);
      let b = playAllUntilGF1(players);
      const gf1 = b.matches.find((m) => m.side === 'GRAND_FINAL' && m.round === 1)!;
      expect(isPlayer(gf1.playerA)).toBe(true);
      expect(isPlayer(gf1.playerB)).toBe(true);

      // LB champion is slot B — they win
      const lbChampion = gf1.playerB as BracketPlayer;
      b = advanceWinner(b, gf1.id, lbChampion.id);

      const reset = b.matches.find((m) => m.side === 'GRAND_FINAL' && m.round === 2)!;
      expect(reset).toBeDefined();
      expect(reset.status).toBe('PENDING');
      expect(isPlayer(reset.playerA)).toBe(true);
      expect(isPlayer(reset.playerB)).toBe(true);
    });
  });

  describe('immutability', () => {
    it('returns a new Bracket object (does not mutate the original)', () => {
      const players = makePlayers(8);
      const original = generateBracket(players);
      const match = original.matches.find(
        (m) => m.side === 'WINNERS' && m.round === 1 && m.position === 1,
      )!;
      const winner = match.playerA as BracketPlayer;

      const originalStatus = match.status;
      advanceWinner(original, match.id, winner.id);

      // Original should not be mutated
      const originalMatch = original.matches.find((m) => m.id === match.id)!;
      expect(originalMatch.status).toBe(originalStatus);
      expect(originalMatch.winnerId).toBeNull();
    });
  });
});
