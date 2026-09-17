# Contributing to BRATS

Thank you for your interest in contributing.

## Development Setup

```sh
git clone https://github.com/Baptiste-lg/BRATS.git
cd BRATS
npm install
cp .env.example .env.local
# Fill in DATABASE_URL and NEXTAUTH_SECRET in .env.local
npx prisma db push
npm run dev
```

## Code Style

All code is formatted with Prettier and linted with ESLint. Run checks before submitting:

```sh
npm run lint
npm run format:check
npm run type-check
```

Auto-fix:

```sh
npm run lint:fix
npm run format
```

## Testing

```sh
# Unit tests (bracket engine, API helpers, Elo)
npm run test

# With coverage (must stay ≥ 80% on src/lib/)
npm run test:coverage

# E2E tests (requires a running server)
npm run test:e2e
```

**Test-driven development is required for the bracket engine and Elo calculator.**
Write failing tests first, then implement.

## Commit Convention

```
[ADD]  New feature or file
[FIX]  Bug fix
[TEST] New or updated tests
[REFACTOR] Code change with no behaviour change
[DOCS] Documentation only
[CHORE] Build system, deps, CI
[AUTO] Automated lint/format fix (CI bot)
```

## Pull Requests

1. Fork and create a branch from `main`.
2. Keep PRs focused — one feature or fix per PR.
3. All tests must pass.
4. The CI pipeline must be green before merge.

## Architecture Notes

- **`src/lib/bracket/`** — Pure TypeScript, no DB, no HTTP. Keep it that way.
- **`src/lib/elo/`** — Pure functions. Side effects only in `service.ts`.
- **`src/app/api/`** — Route Handlers. Always use `handleError()` to catch errors.
- **`src/middleware.ts`** — Protected routes list. Add new protected paths here.
