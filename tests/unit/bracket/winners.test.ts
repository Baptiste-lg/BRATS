import { describe, it, expect } from 'vitest';
import { generateBracket } from '@/lib/bracket';
import type { BracketPlayer } from '@/lib/bracket/types';
import { isPlayer, isBye } from '@/lib/bracket/types';

function makePlayers(count: number): BracketPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    seed: i + 1,
  }));
}

// =============================================================================
// Winners bracket structure
// =============================================================================
describe('generateBracket — winners bracket', () => {
  describe('8 players (perfect bracket)', () => {
    const bracket = generateBracket(makePlayers(8));
    const winners = bracket.matches.filter((m) => m.side === 'WINNERS');

    it('generates 7 winners bracket matches (2^3 - 1)', () => {
      expect(winners).toHaveLength(7);
    });

    it('round 1 has 4 matches', () => {
      expect(winners.filter((m) => m.round === 1)).toHaveLength(4);
    });

    it('round 2 has 2 matches', () => {
      expect(winners.filter((m) => m.round === 2)).toHaveLength(2);
    });

    it('round 3 (winners final) has 1 match', () => {
      expect(winners.filter((m) => m.round === 3)).toHaveLength(1);
    });

    it('all round 1 matches have two real players (no byes)', () => {
      const r1 = winners.filter((m) => m.round === 1);
      for (const match of r1) {
        expect(isPlayer(match.playerA)).toBe(true);
        expect(isPlayer(match.playerB)).toBe(true);
      }
    });

    it('every winners match (except final) has a nextMatchId pointing to round+1', () => {
      const nonFinal = winners.filter((m) => m.round < bracket.winnersRounds);
      for (const match of nonFinal) {
        expect(match.nextMatchId).not.toBeNull();
      }
    });

    it('winners final has a nextMatchId pointing to the grand final', () => {
      const final = winners.find((m) => m.round === bracket.winnersRounds);
      expect(final).toBeDefined();
      expect(final!.nextMatchId).toBe('GRAND_FINAL-R1-P1');
    });

    it('all round 1 matches have a loserMatchId (losers bracket entry)', () => {
      const r1 = winners.filter((m) => m.round === 1);
      for (const match of r1) {
        expect(match.loserMatchId).not.toBeNull();
      }
    });

    it('all match IDs follow the pattern WINNERS-R{r}-P{p}', () => {
      for (const match of winners) {
        expect(match.id).toMatch(/^WINNERS-R\d+-P\d+$/);
      }
    });

    it('all matches start with PENDING status', () => {
      for (const match of winners) {
        expect(match.status).toBe('PENDING');
      }
    });
  });

  describe('4 players', () => {
    const bracket = generateBracket(makePlayers(4));
    const winners = bracket.matches.filter((m) => m.side === 'WINNERS');

    it('generates 3 winners matches', () => {
      expect(winners).toHaveLength(3);
    });

    it('round 1 has 2 matches', () => {
      expect(winners.filter((m) => m.round === 1)).toHaveLength(2);
    });
  });

  describe('2 players', () => {
    const bracket = generateBracket(makePlayers(2));
    const winners = bracket.matches.filter((m) => m.side === 'WINNERS');

    it('generates 1 winners match', () => {
      expect(winners).toHaveLength(1);
    });
  });

  describe('5 players (3 byes)', () => {
    const bracket = generateBracket(makePlayers(5));
    const winners = bracket.matches.filter((m) => m.side === 'WINNERS');
    const r1 = winners.filter((m) => m.round === 1);

    it('round 1 has 4 matches (to fill 8-slot bracket)', () => {
      expect(r1).toHaveLength(4);
    });

    it('exactly 3 round 1 matches contain a bye', () => {
      const byeMatches = r1.filter((m) => isBye(m.playerA) || isBye(m.playerB));
      expect(byeMatches).toHaveLength(3);
    });
  });

  describe('7 players (1 bye)', () => {
    const bracket = generateBracket(makePlayers(7));
    const winners = bracket.matches.filter((m) => m.side === 'WINNERS');
    const r1 = winners.filter((m) => m.round === 1);

    it('round 1 has 4 matches', () => {
      expect(r1).toHaveLength(4);
    });

    it('exactly 1 round 1 match contains a bye', () => {
      const byeMatches = r1.filter((m) => isBye(m.playerA) || isBye(m.playerB));
      expect(byeMatches).toHaveLength(1);
    });
  });

  describe('3 players (1 bye)', () => {
    const bracket = generateBracket(makePlayers(3));
    const r1 = bracket.matches.filter((m) => m.side === 'WINNERS' && m.round === 1);

    it('round 1 has 2 matches', () => {
      expect(r1).toHaveLength(2);
    });

    it('exactly 1 bye in round 1', () => {
      const byeMatches = r1.filter((m) => isBye(m.playerA) || isBye(m.playerB));
      expect(byeMatches).toHaveLength(1);
    });
  });

  describe('seeding', () => {
    it('seed 1 and seed 2 are on opposite halves of the bracket (8 players)', () => {
      const bracket = generateBracket(makePlayers(8));
      const r1 = bracket.matches.filter((m) => m.side === 'WINNERS' && m.round === 1);
      const seedOneMatch = r1.findIndex(
        (m) =>
          (isPlayer(m.playerA) && m.playerA.seed === 1) ||
          (isPlayer(m.playerB) && m.playerB.seed === 1),
      );
      const seedTwoMatch = r1.findIndex(
        (m) =>
          (isPlayer(m.playerA) && m.playerA.seed === 2) ||
          (isPlayer(m.playerB) && m.playerB.seed === 2),
      );
      // Seeds 1 and 2 should be in different matches
      expect(seedOneMatch).not.toBe(seedTwoMatch);
    });

    it('seed 1 faces seed 8 in round 1 (8 players)', () => {
      const bracket = generateBracket(makePlayers(8));
      const r1 = bracket.matches.filter((m) => m.side === 'WINNERS' && m.round === 1);
      const seedOneMatch = r1.find(
        (m) =>
          (isPlayer(m.playerA) && m.playerA.seed === 1) ||
          (isPlayer(m.playerB) && m.playerB.seed === 1),
      );
      expect(seedOneMatch).toBeDefined();
      const opponent =
        isPlayer(seedOneMatch!.playerA) && seedOneMatch!.playerA.seed === 1
          ? seedOneMatch!.playerB
          : seedOneMatch!.playerA;
      expect(isPlayer(opponent) && opponent.seed).toBe(8);
    });
  });
});
