import { describe, it, expect } from 'vitest';
import { calculateElo, expectedScore, getKFactor } from '@/lib/elo/calculator';
import { DEFAULT_ELO, K_FACTOR_NEW, K_FACTOR_MID, K_FACTOR_EST } from '@/lib/elo/types';

// =============================================================================
// expectedScore
// =============================================================================
describe('expectedScore', () => {
  it('returns 0.5 when both players have equal ratings', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
  });

  it('returns > 0.5 when player has higher rating', () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
  });

  it('returns < 0.5 when player has lower rating', () => {
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5);
  });

  it('returns a value between 0 and 1', () => {
    const e1 = expectedScore(2800, 800);
    const e2 = expectedScore(800, 2800);
    expect(e1).toBeGreaterThan(0);
    expect(e1).toBeLessThan(1);
    expect(e2).toBeGreaterThan(0);
    expect(e2).toBeLessThan(1);
  });

  it('expected scores of two players sum to 1', () => {
    const ea = expectedScore(1400, 1000);
    const eb = expectedScore(1000, 1400);
    expect(ea + eb).toBeCloseTo(1);
  });
});

// =============================================================================
// getKFactor
// =============================================================================
describe('getKFactor', () => {
  it('returns K=40 for new players (< 30 games)', () => {
    expect(getKFactor(0)).toBe(K_FACTOR_NEW);
    expect(getKFactor(29)).toBe(K_FACTOR_NEW);
  });

  it('returns K=20 for mid-level players (30–100 games)', () => {
    expect(getKFactor(30)).toBe(K_FACTOR_MID);
    expect(getKFactor(100)).toBe(K_FACTOR_MID);
  });

  it('returns K=10 for established players (> 100 games)', () => {
    expect(getKFactor(101)).toBe(K_FACTOR_EST);
    expect(getKFactor(500)).toBe(K_FACTOR_EST);
  });
});

// =============================================================================
// calculateElo
// =============================================================================
describe('calculateElo', () => {
  it('winner gains Elo and loser loses Elo', () => {
    const result = calculateElo({ winnerElo: 1000, loserElo: 1000 });
    expect(result.newWinnerElo).toBeGreaterThan(1000);
    expect(result.newLoserElo).toBeLessThan(1000);
  });

  it('the gain and loss are symmetric when ratings are equal', () => {
    const result = calculateElo({ winnerElo: 1000, loserElo: 1000 });
    expect(result.winnerDelta).toBe(-result.loserDelta);
  });

  it('upset (lower-rated beats higher-rated) gives larger gain', () => {
    const upset = calculateElo({ winnerElo: 800, loserElo: 1200 });
    const expected = calculateElo({ winnerElo: 1200, loserElo: 800 });
    expect(upset.winnerDelta).toBeGreaterThan(expected.winnerDelta);
  });

  it('favorite beating underdog gives smaller gain', () => {
    const fav = calculateElo({ winnerElo: 1200, loserElo: 800 });
    const eq = calculateElo({ winnerElo: 1000, loserElo: 1000 });
    expect(fav.winnerDelta).toBeLessThan(eq.winnerDelta);
  });

  it('new players (0 games) use K=40', () => {
    const r = calculateElo({
      winnerElo: 1000,
      loserElo: 1000,
      winnerGamesPlayed: 0,
      loserGamesPlayed: 0,
    });
    // With equal ratings, expected = 0.5, delta = K*(1-0.5) = 40*0.5 = 20
    expect(r.winnerDelta).toBe(20);
    expect(r.loserDelta).toBe(-20);
  });

  it('established players (>100 games) use K=10', () => {
    const r = calculateElo({
      winnerElo: 1000,
      loserElo: 1000,
      winnerGamesPlayed: 200,
      loserGamesPlayed: 200,
    });
    // delta = K*(1-0.5) = 10*0.5 = 5
    expect(r.winnerDelta).toBe(5);
    expect(r.loserDelta).toBe(-5);
  });

  it('returns integer Elo values', () => {
    const r = calculateElo({ winnerElo: 1000, loserElo: 1000 });
    expect(Number.isInteger(r.newWinnerElo)).toBe(true);
    expect(Number.isInteger(r.newLoserElo)).toBe(true);
  });

  it('Elo never goes below 100', () => {
    const r = calculateElo({ winnerElo: 2800, loserElo: 100 });
    expect(r.newLoserElo).toBeGreaterThanOrEqual(100);
  });

  it('reports the applied delta when the floor clamps a rating', () => {
    const r = calculateElo({ winnerElo: 2800, loserElo: 100 });
    expect(r.loserDelta).toBe(r.newLoserElo - 100);
  });

  it('default Elo is 1000', () => {
    expect(DEFAULT_ELO).toBe(1000);
  });
});
