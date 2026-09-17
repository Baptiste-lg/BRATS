import { describe, it, expect } from 'vitest';
import { generateTournamentCode, isValidTournamentCode } from '@/lib/tournament-code';

describe('generateTournamentCode', () => {
  it('generates a string of the default length (6)', () => {
    expect(generateTournamentCode()).toHaveLength(6);
  });

  it('generates a string of a custom length', () => {
    expect(generateTournamentCode(8)).toHaveLength(8);
    expect(generateTournamentCode(4)).toHaveLength(4);
  });

  it('only contains lowercase alphanumeric characters', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateTournamentCode()).toMatch(/^[a-z0-9]+$/);
    }
  });

  it('generates unique codes (probabilistic)', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateTournamentCode()));
    // With 36^6 ≈ 2.1 billion possibilities, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });
});

describe('isValidTournamentCode', () => {
  it('accepts a valid 6-char code', () => {
    expect(isValidTournamentCode('abc123')).toBe(true);
  });

  it('accepts minimum length (4 chars)', () => {
    expect(isValidTournamentCode('ab12')).toBe(true);
  });

  it('accepts maximum length (12 chars)', () => {
    expect(isValidTournamentCode('abcdef123456')).toBe(true);
  });

  it('rejects codes that are too short (< 4)', () => {
    expect(isValidTournamentCode('ab1')).toBe(false);
    expect(isValidTournamentCode('')).toBe(false);
  });

  it('rejects codes that are too long (> 12)', () => {
    expect(isValidTournamentCode('abcdef1234567')).toBe(false);
  });

  it('rejects codes with uppercase letters', () => {
    expect(isValidTournamentCode('ABC123')).toBe(false);
  });

  it('rejects codes with special characters', () => {
    expect(isValidTournamentCode('abc-12')).toBe(false);
    expect(isValidTournamentCode('abc_12')).toBe(false);
    expect(isValidTournamentCode('abc 12')).toBe(false);
  });
});
