# BRATS — Bracket + TS

[![BRATS CI/CD](https://github.com/Baptiste-lg/BRATS/actions/workflows/ci.yml/badge.svg)](https://github.com/Baptiste-lg/BRATS/actions/workflows/ci.yml)
[![Docker Build & Push](https://github.com/Baptiste-lg/BRATS/actions/workflows/docker.yml/badge.svg)](https://github.com/Baptiste-lg/BRATS/actions/workflows/docker.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

> Create and share tournament brackets in seconds. Full-stack TypeScript.

## What is BRATS?

BRATS lets any organizer create a **double-elimination tournament bracket** in under a minute:
set a name, paste a player list, share **one link**. Players report their own scores without
creating an account. The organizer validates, and the bracket updates live.

Built for local communities — Smash tournaments, Rocket League sessions, board game nights,
game jams. Existing tools (Challonge, bracket.gg) are either old, paywalled, or overkill.
BRATS is minimal, beautiful, mobile-first.

## Features

### MVP
- **One-click bracket generation** — paste a player list, get a full double-elimination bracket
- **Public share link** — one URL, three roles: organizer (session), player (signed token), spectator
- **Accountless players** — players report scores via their unique link, no sign-up required
- **Live validation** — organizer validates scores, losers bracket propagates automatically
- **Organizer dashboard** — history of all your tournaments with stats
- **Elo tracking** — persistent Elo rating across tournaments for identified players
- **100% tested bracket engine** — pure TypeScript module, zero dependencies, fully unit-tested

### Planned (v2)
- Round-robin pools + playoffs
- WebSocket / SSE live updates (no refresh)
- PNG bracket export for social media
- Match timer with automatic walkover

## Stack

| Layer    | Choice                              | Why                                        |
|----------|-------------------------------------|--------------------------------------------|
| Frontend | Next.js 15 (App Router) + TypeScript | SSR, typed routes, Vercel-ready           |
| API      | Next.js Route Handlers (REST)       | Single repo, single language               |
| Database | PostgreSQL + Prisma                 | Type-safe ORM, migrations, generated types |
| Auth     | NextAuth.js                         | Magic link + OAuth GitHub                  |
| Tests    | Vitest (unit) + Playwright (E2E)    | Pure engine = 100% testable                |
| Deploy   | Vercel + Neon (Postgres)            | Free tier, instant CI deploys              |

## Architecture

```
brats/
├── src/
│   ├── app/                    Next.js App Router
│   │   ├── t/[code]/           Public tournament page (3 role views)
│   │   ├── dashboard/          Organizer account & history
│   │   └── api/                REST route handlers
│   ├── lib/
│   │   └── bracket/            Pure double-elimination engine (no DB, no HTTP)
│   ├── components/             Reusable UI components
│   └── types/                  Shared TypeScript types
├── prisma/                     Schema + migrations
└── tests/
    ├── unit/                   Vitest — bracket engine & pure logic
    └── e2e/                    Playwright — critical user flows
```

The **bracket engine** is a pure module: input = player list, output = full bracket tree.
Zero database, zero HTTP — 100% testable, 100% reusable.

## Data Model

```
User          — id, email, name
Tournament    — id, code (URL slug), name, format, status: draft|live|done, organizerId
Player        — id, tournamentId, name, seed (anonymous by default, linkable to a User)
Match         — id, round, bracketSide: winners|losers|grand, playerA, playerB,
                scoreA, scoreB, status: pending|awaiting_validation|done
EloRecord     — playerName (global), tournamentId, eloBefore, eloAfter
```

## Development

### Prerequisites

- Node.js 22+
- PostgreSQL (or a [Neon](https://neon.tech) / [Supabase](https://supabase.com) connection string)

### Setup

```sh
git clone https://github.com/Baptiste-lg/BRATS.git
cd BRATS
npm install

# Copy and fill in your environment variables
cp .env.example .env.local

# Push the database schema
npx prisma db push

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command                | Description                                  |
|------------------------|----------------------------------------------|
| `npm run dev`          | Start Next.js dev server (Turbopack)         |
| `npm run build`        | Production build                             |
| `npm run lint`         | ESLint check                                 |
| `npm run lint:fix`     | ESLint auto-fix                              |
| `npm run format`       | Prettier format                              |
| `npm run format:check` | Prettier check (CI)                          |
| `npm run type-check`   | TypeScript strict check                      |
| `npm run test`         | Run unit tests (Vitest)                      |
| `npm run test:coverage`| Unit tests with coverage report (≥ 80%)      |
| `npm run test:e2e`     | End-to-end tests (Playwright)                |

### Tests

```sh
# Unit tests — bracket engine (TDD, must pass 100%)
npm run test

# Coverage report (target: ≥ 80% on src/lib/)
npm run test:coverage

# End-to-end tests (requires running server or CI webServer)
npm run test:e2e
```

## Roadmap

- [x] Project setup & configuration
- [ ] Prisma schema (User, Tournament, Player, Match, EloRecord)
- [ ] Double-elimination bracket engine (TDD — byes, odd counts, grand final reset)
- [ ] CI/CD pipelines + Docker
- [ ] NextAuth (magic link + GitHub OAuth)
- [ ] REST API routes
- [ ] Frontend UI (bracket view, score reporting, live updates)
- [ ] Elo system (cross-tournament ratings)
- [ ] Playwright E2E tests

## License

[MIT](LICENSE) © Baptiste-lg
