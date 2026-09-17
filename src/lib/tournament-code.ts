// =============================================================================
// Tournament code generator
// Generates short, URL-friendly codes like "abc123" for tournament share links.
// =============================================================================

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 6;

/**
 * Generates a random alphanumeric tournament code.
 * Uses crypto.getRandomValues for unbiased randomness.
 */
export function generateTournamentCode(length = CODE_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length]!)
    .join('');
}

/**
 * Validates that a tournament code matches the expected format.
 * Codes must be 4–12 lowercase alphanumeric characters.
 */
export function isValidTournamentCode(code: string): boolean {
  return /^[a-z0-9]{4,12}$/.test(code);
}
