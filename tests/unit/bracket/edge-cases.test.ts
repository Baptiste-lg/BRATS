import { describe, it, expect } from 'vitest';
import { advanceWinner, generateBracket } from '@/lib/bracket';
import type { BracketPlayer } from '@/lib/bracket/types';
import { isBye, isPlayer } from '@/lib/bracket/types';

function makePlayers(count: number): BracketPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    seed: i + 1,
  }));
}

// =============================================================================
// Edge cases: odd/non-power-of-2 player counts, minimal counts
// =============================================================================

describe('generateBracket — edge cases', () => {
  describe('1 player', () => {
    const bracket = generateBracket(makePlayers(1));

    it('returns empty matches for a single player', () => {
      expect(bracket.matches).toHaveLength(0);
    });

    it('has 1 player', () => {
      expect(bracket.players).toHaveLength(1);
    });
  });

  describe('2 players', () => {
    const bracket = generateBracket(makePlayers(2));

    it('bracket contains matches', () => {
      expect(bracket.matches.length).toBeGreaterThan(0);
    });

    it('has a grand final', () => {
      const gf = bracket.matches.filter((m) => m.side === 'GRAND_FINAL');
      expect(gf.length).toBeGreaterThan(0);
    });
  });

  describe('3 players (1 bye)', () => {
    const bracket = generateBracket(makePlayers(3));

    it('produces a valid bracket', () => {
      expect(bracket.matches.length).toBeGreaterThan(0);
    });

    it('has exactly 1 bye in round 1', () => {
      const r1 = bracket.matches.filter((m) => m.side === 'WINNERS' && m.round === 1);
      const byes = r1.filter((m) => isBye(m.playerA) || isBye(m.playerB));
      expect(byes).toHaveLength(1);
    });

    it('bye match is auto-resolved (status DONE)', () => {
      const r1 = bracket.matches.filter((m) => m.side === 'WINNERS' && m.round === 1);
      const byeMatch = r1.find((m) => isBye(m.playerA) || isBye(m.playerB));
      expect(byeMatch).toBeDefined();
      expect(byeMatch!.status).toBe('DONE');
      expect(byeMatch!.winnerId).not.toBeNull();
    });
  });

  describe('5 players (3 byes)', () => {
    const bracket = generateBracket(makePlayers(5));

    it('produces a valid bracket with 5 players', () => {
      expect(bracket.players).toHaveLength(5);
    });

    it('has 3 byes in round 1', () => {
      const r1 = bracket.matches.filter((m) => m.side === 'WINNERS' && m.round === 1);
      const byes = r1.filter((m) => isBye(m.playerA) || isBye(m.playerB));
      expect(byes).toHaveLength(3);
    });

    it('all 3 bye matches are auto-resolved', () => {
      const r1 = bracket.matches.filter((m) => m.side === 'WINNERS' && m.round === 1);
      const byeMatches = r1.filter((m) => isBye(m.playerA) || isBye(m.playerB));
      for (const m of byeMatches) {
        expect(m.status).toBe('DONE');
        expect(m.winnerId).not.toBeNull();
      }
    });
  });

  describe('7 players (1 bye)', () => {
    const bracket = generateBracket(makePlayers(7));

    it('has 1 bye in round 1', () => {
      const r1 = bracket.matches.filter((m) => m.side === 'WINNERS' && m.round === 1);
      const byes = r1.filter((m) => isBye(m.playerA) || isBye(m.playerB));
      expect(byes).toHaveLength(1);
    });
  });

  describe('match count invariants', () => {
    // In double-elimination, total matches = 2n - 2 (or 2n - 1 with grand final reset)
    // where n = number of players.

    it('8 players: total real (non-bye-only) matches in winners = 7', () => {
      const b = generateBracket(makePlayers(8));
      const w = b.matches.filter((m) => m.side === 'WINNERS');
      expect(w).toHaveLength(7);
    });

    it('4 players: total winners matches = 3', () => {
      const b = generateBracket(makePlayers(4));
      const w = b.matches.filter((m) => m.side === 'WINNERS');
      expect(w).toHaveLength(3);
    });

    it('all match IDs are unique across the entire bracket (8 players)', () => {
      const b = generateBracket(makePlayers(8));
      const ids = b.matches.map((m) => m.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('all match IDs are unique across the entire bracket (5 players)', () => {
      const b = generateBracket(makePlayers(5));
      const ids = b.matches.map((m) => m.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  describe('nextMatchId references point to existing matches', () => {
    it('all nextMatchIds reference real match IDs (8 players)', () => {
      const b = generateBracket(makePlayers(8));
      const idSet = new Set(b.matches.map((m) => m.id));
      for (const match of b.matches) {
        if (match.nextMatchId !== null) {
          expect(idSet.has(match.nextMatchId)).toBe(true);
        }
      }
    });

    it('all loserMatchIds reference real match IDs (8 players)', () => {
      const b = generateBracket(makePlayers(8));
      const idSet = new Set(b.matches.map((m) => m.id));
      for (const match of b.matches) {
        if (match.loserMatchId !== null) {
          expect(idSet.has(match.loserMatchId)).toBe(true);
        }
      }
    });

    it('all nextMatchIds reference real match IDs (5 players)', () => {
      const b = generateBracket(makePlayers(5));
      const idSet = new Set(b.matches.map((m) => m.id));
      for (const match of b.matches) {
        if (match.nextMatchId !== null) {
          expect(idSet.has(match.nextMatchId)).toBe(true);
        }
      }
    });
  });

  describe('determinism', () => {
    it('same input always produces the same bracket (8 players)', () => {
      const players = makePlayers(8);
      const b1 = generateBracket(players);
      const b2 = generateBracket(players);
      expect(b1.matches.map((m) => m.id)).toEqual(b2.matches.map((m) => m.id));
    });
  });

  it('fully resolves every supported player count up to the API limit', () => {
    for (let count = 2; count <= 256; count++) {
      let bracket = generateBracket(makePlayers(count));
      let readyMatch = bracket.matches.find(
        (match) => match.status === 'PENDING' && isPlayer(match.playerA) && isPlayer(match.playerB),
      );

      while (readyMatch !== undefined) {
        const playerA = readyMatch.playerA;
        if (!isPlayer(playerA)) break;
        bracket = advanceWinner(bracket, readyMatch.id, playerA.id);
        readyMatch = bracket.matches.find(
          (match) =>
            match.status === 'PENDING' && isPlayer(match.playerA) && isPlayer(match.playerB),
        );
      }

      expect(bracket.matches.every((match) => match.status === 'DONE')).toBe(true);
    }
  }, 60_000);

  describe('input validation', () => {
    it('rejects duplicate player IDs', () => {
      expect(() =>
        generateBracket([
          { id: 'same', name: 'A', seed: 1 },
          { id: 'same', name: 'B', seed: 2 },
        ]),
      ).toThrow(/Duplicate player id/);
    });

    it('rejects duplicate seeds', () => {
      expect(() =>
        generateBracket([
          { id: 'p1', name: 'A', seed: 1 },
          { id: 'p2', name: 'B', seed: 1 },
        ]),
      ).toThrow(/Duplicate seed/);
    });

    it('rejects invalid seeds', () => {
      expect(() =>
        generateBracket([
          { id: 'p1', name: 'A', seed: 0 },
          { id: 'p2', name: 'B', seed: 2 },
        ]),
      ).toThrow(/Invalid seed/);
    });
  });
});
