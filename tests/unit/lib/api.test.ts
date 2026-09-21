import { describe, it, expect } from 'vitest';
import { handleError, parseBody } from '@/lib/api';
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';

describe('handleError', () => {
  it('returns 401 for AuthError', async () => {
    const res = handleError(new AuthError('Unauthorized', 401));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 for NotFoundError', async () => {
    const res = handleError(new NotFoundError('Tournament not found'));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Tournament not found');
  });

  it('returns 422 for ValidationError', async () => {
    const res = handleError(new ValidationError('Invalid input'));
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Invalid input');
  });

  it('returns 403 for ForbiddenError', async () => {
    const res = handleError(new ForbiddenError('Access denied'));
    expect(res.status).toBe(403);
  });

  it('returns 500 for unknown errors without leaking details', async () => {
    const res = handleError(new Error('db connection failed'));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Internal server error');
    expect(body.error).not.toContain('db connection');
  });

  it('returns 500 for non-Error throws', async () => {
    const res = handleError('something went wrong');
    expect(res.status).toBe(500);
  });
});

describe('parseBody', () => {
  it('rejects malformed JSON', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: '{',
    });

    await expect(parseBody(request, () => true)).rejects.toMatchObject({ status: 422 });
  });

  it.each([null, [], 'text', 42])('rejects non-object JSON: %j', async (body) => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    await expect(parseBody(request, () => true)).rejects.toMatchObject({ status: 422 });
  });
});
