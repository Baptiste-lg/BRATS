import { describe, it, expect } from 'vitest';
import {
  nextPowerOfTwo,
  byeCount,
  buildSeedingPairs,
  buildSeededSlots,
  matchId,
} from '@/lib/bracket/utils';
import { isBye, isPlayer } from '@/lib/bracket/types';
import type { BracketPlayer } from '@/lib/bracket/types';

// =============================================================================
// nextPowerOfTwo
// =============================================================================
describe('nextPowerOfTwo', () => {
  it('returns 1 for 1', () => expect(nextPowerOfTwo(1)).toBe(1));
  it('returns 2 for 2', () => expect(nextPowerOfTwo(2)).toBe(2));
  it('returns 4 for 3', () => expect(nextPowerOfTwo(3)).toBe(4));
  it('returns 4 for 4', () => expect(nextPowerOfTwo(4)).toBe(4));
  it('returns 8 for 5', () => expect(nextPowerOfTwo(5)).toBe(8));
  it('returns 8 for 7', () => expect(nextPowerOfTwo(7)).toBe(8));
  it('returns 8 for 8', () => expect(nextPowerOfTwo(8)).toBe(8));
  it('returns 16 for 9', () => expect(nextPowerOfTwo(9)).toBe(16));
  it('returns 16 for 16', () => expect(nextPowerOfTwo(16)).toBe(16));
  it('throws on 0', () => expect(() => nextPowerOfTwo(0)).toThrow(RangeError));
  it('throws on negative', () => expect(() => nextPowerOfTwo(-1)).toThrow(RangeError));
  it('throws on non-integers', () => expect(() => nextPowerOfTwo(1.5)).toThrow(RangeError));
  it('throws on NaN', () => expect(() => nextPowerOfTwo(Number.NaN)).toThrow(RangeError));
});

// =============================================================================
// byeCount
// =============================================================================
describe('byeCount', () => {
  it('0 byes for 8 players', () => expect(byeCount(8)).toBe(0));
  it('1 bye for 7 players', () => expect(byeCount(7)).toBe(1));
  it('3 byes for 5 players', () => expect(byeCount(5)).toBe(3));
  it('1 bye for 3 players', () => expect(byeCount(3)).toBe(1));
  it('0 byes for 4 players', () => expect(byeCount(4)).toBe(0));
  it('0 byes for 1 player', () => expect(byeCount(1)).toBe(0));
  it('0 byes for 2 players', () => expect(byeCount(2)).toBe(0));
});

// =============================================================================
// buildSeedingPairs
// =============================================================================
describe('buildSeedingPairs', () => {
  it('returns [(1,2)] for size 2', () => {
    expect(buildSeedingPairs(2)).toEqual([[1, 2]]);
  });

  it('returns correct pairs for size 4', () => {
    const pairs = buildSeedingPairs(4);
    // Expected: (1,4),(2,3) — top seed faces last seed, etc.
    expect(pairs).toHaveLength(2);
    // Each pair must sum to size+1 = 5
    for (const [a, b] of pairs) {
      expect(a + b).toBe(5);
    }
  });

  it('returns 4 pairs for size 8, each summing to 9', () => {
    const pairs = buildSeedingPairs(8);
    expect(pairs).toHaveLength(4);
    for (const [a, b] of pairs) {
      expect(a + b).toBe(9);
    }
  });

  it('returns 8 pairs for size 16, each summing to 17', () => {
    const pairs = buildSeedingPairs(16);
    expect(pairs).toHaveLength(8);
    for (const [a, b] of pairs) {
      expect(a + b).toBe(17);
    }
  });

  it('covers all seeds exactly once for size 8', () => {
    const pairs = buildSeedingPairs(8);
    const seeds = pairs.flat().sort((a, b) => a - b);
    expect(seeds).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('rejects a non-power-of-two size', () => {
    expect(() => buildSeedingPairs(3)).toThrow(RangeError);
  });
});

// =============================================================================
// buildSeededSlots
// =============================================================================
function makePlayers(count: number): BracketPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    seed: i + 1,
  }));
}

describe('buildSeededSlots', () => {
  it('returns 4 pairs for 8 players', () => {
    const slots = buildSeededSlots(makePlayers(8));
    expect(slots).toHaveLength(4);
  });

  it('all 8 players are present with no byes', () => {
    const players = makePlayers(8);
    const slots = buildSeededSlots(players);
    const flat = slots.flat();
    expect(flat.filter(isPlayer)).toHaveLength(8);
    expect(flat.filter(isBye)).toHaveLength(0);
  });

  it('injects 3 byes for 5 players', () => {
    const players = makePlayers(5);
    const slots = buildSeededSlots(players);
    const flat = slots.flat();
    expect(flat.filter(isBye)).toHaveLength(3);
    expect(flat.filter(isPlayer)).toHaveLength(5);
  });

  it('injects 1 bye for 7 players', () => {
    const players = makePlayers(7);
    const slots = buildSeededSlots(players);
    const flat = slots.flat();
    expect(flat.filter(isBye)).toHaveLength(1);
    expect(flat.filter(isPlayer)).toHaveLength(7);
  });

  it('works for a single player (no real match needed)', () => {
    const slots = buildSeededSlots(makePlayers(1));
    expect(slots).toHaveLength(1);
  });

  it('works for 2 players', () => {
    const slots = buildSeededSlots(makePlayers(2));
    expect(slots).toHaveLength(1);
    const [a, b] = slots[0]!;
    expect(isPlayer(a)).toBe(true);
    expect(isPlayer(b)).toBe(true);
  });

  it('seed 1 faces a bye first when byes exist (3 players)', () => {
    const players = makePlayers(3);
    const slots = buildSeededSlots(players);
    // With 3 players, 1 bye. Seed 1 should face the bye.
    const seedOnePair = slots.find(
      ([a, b]) => (isPlayer(a) && a.seed === 1) || (isPlayer(b) && b.seed === 1),
    );
    expect(seedOnePair).toBeDefined();
    const [a, b] = seedOnePair!;
    const opponentOfSeedOne = isPlayer(a) && a.seed === 1 ? b : a;
    expect(isBye(opponentOfSeedOne)).toBe(true);
  });
});

// =============================================================================
// matchId
// =============================================================================
describe('matchId', () => {
  it('generates stable IDs', () => {
    expect(matchId('WINNERS', 1, 1)).toBe('WINNERS-R1-P1');
    expect(matchId('LOSERS', 2, 3)).toBe('LOSERS-R2-P3');
    expect(matchId('GRAND_FINAL', 1, 1)).toBe('GRAND_FINAL-R1-P1');
  });
});
