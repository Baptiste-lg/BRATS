import { NextResponse } from 'next/server';
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';

// =============================================================================
// API response helpers
// =============================================================================

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

/**
 * Handles known application errors and converts them to JSON responses.
 * Catches AuthError, NotFoundError, ValidationError, ForbiddenError.
 * Re-throws unexpected errors (will result in a 500 from Next.js).
 */
export function handleError(error: unknown): NextResponse {
  if (
    error instanceof AuthError ||
    error instanceof NotFoundError ||
    error instanceof ValidationError ||
    error instanceof ForbiddenError
  ) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  // Log unexpected errors (without exposing internals to the client)
  console.error('[API Error]', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/**
 * Parses and validates a JSON request body. Returns null if the body is invalid.
 */
export async function parseBody<T>(request: Request, validate: (body: unknown) => T): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }

  // Every current JSON endpoint expects an object. Rejecting null, arrays and
  // primitive values here keeps route validators simple and avoids turning a
  // malformed payload into an unexpected 500 response.
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object');
  }

  return validate(body);
}
