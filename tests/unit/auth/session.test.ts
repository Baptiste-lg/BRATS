import { describe, it, expect } from 'vitest';
import { AuthError } from '@/lib/errors';

// =============================================================================
// AuthError
// =============================================================================
describe('AuthError', () => {
  it('is an instance of Error', () => {
    const err = new AuthError('Unauthorized', 401);
    expect(err).toBeInstanceOf(Error);
  });

  it('has the correct name', () => {
    const err = new AuthError('Unauthorized', 401);
    expect(err.name).toBe('AuthError');
  });

  it('carries the correct message', () => {
    const err = new AuthError('Forbidden', 403);
    expect(err.message).toBe('Forbidden');
  });

  it('carries the correct status code', () => {
    const err = new AuthError('Not Found', 404);
    expect(err.status).toBe(404);
  });

  it('can be caught as an AuthError', () => {
    expect(() => {
      throw new AuthError('Unauthorized', 401);
    }).toThrow(AuthError);
  });
});
