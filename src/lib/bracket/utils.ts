import type { BracketPlayer, Slot, Bye } from './types';

// =============================================================================
// Utility functions for bracket generation
// =============================================================================

/** Returns the smallest power of 2 >= n. */
export function nextPowerOfTwo(n: number): number {
  if (n <= 0) throw new RangeError('n must be a positive integer');
  if (n === 1) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** Returns the number of byes needed to fill a power-of-2 bracket. */
export function byeCount(playerCount: number): number {
  return nextPowerOfTwo(playerCount) - playerCount;
}

/**
 * Creates the Bye sentinel object.
 */
export function makeBye(): Bye {
  return { isBye: true };
}

/**
 * Arranges players by seed and injects byes into the standard double-elimination
 * seeding positions so that the highest seeds meet as late as possible.
 *
 * Standard seeding for 8 slots:
 *   Match 1: seed 1 vs seed 8
 *   Match 2: seed 4 vs seed 5
 *   Match 3: seed 3 vs seed 6
 *   Match 4: seed 2 vs seed 7
 *
 * For non-power-of-2 counts, byes are placed against the top seeds (seeds 1, 2, ...)
 * so they auto-advance to round 2 without a real opponent.
 *
 * Returns a flat array of Slot pairs: [A1, B1, A2, B2, A3, B3, ...]
 * where A_i and B_i are the two players in match i of round 1.
 */
export function buildSeededSlots(players: BracketPlayer[]): [Slot, Slot][] {
  const size = nextPowerOfTwo(players.length);
  const byes = byeCount(players.length);

  // Sort players by seed ascending (lower seed = better = higher position)
  const sorted = [...players].sort((a, b) => a.seed - b.seed);

  // Fill slots: players first, then byes
  const slots: Slot[] = [
    ...sorted,
    ...Array.from({ length: byes }, () => makeBye()),
  ];

  // Standard bracket seeding pattern for `size` slots.
  // Produces pairs: (1 vs size), (size/2 vs size/2+1), ...
  const pairs = buildSeedingPairs(size);

  return pairs.map(([a, b]) => [
    slots[a - 1] ?? makeBye(),
    slots[b - 1] ?? makeBye(),
  ]);
}

/**
 * Builds the standard single/double-elim seeding pairs for a bracket of `size`.
 * Returns 1-based seed position pairs: [(1,8),(4,5),(3,6),(2,7)] for size=8.
 *
 * Algorithm: recursively split the bracket.
 */
export function buildSeedingPairs(size: number): [number, number][] {
  if (size === 2) return [[1, 2]];

  const half = size / 2;
  const pairs: [number, number][] = [];

  // Build top half recursively, then interleave with bottom half
  const topPairs = buildSeedingPairs(half);
  for (const [a, b] of topPairs) {
    pairs.push([a, size + 1 - a]);
    pairs.push([b, size + 1 - b]);
  }

  return pairs;
}

/**
 * Generates a stable match ID.
 */
export function matchId(
  side: string,
  round: number,
  position: number,
): string {
  return `${side}-R${round}-P${position}`;
}
