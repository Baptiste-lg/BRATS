import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';

const prisma = new PrismaClient();
const code = `e2e${randomBytes(4).toString('hex')}`;
let tournamentId: string;
let organizerId: string;
let playerToken: string;

test.beforeAll(async () => {
  const organizer = await prisma.user.create({
    data: { email: `e2e-${code}@example.com`, name: 'E2E Organizer' },
  });
  organizerId = organizer.id;
  const tournament = await prisma.tournament.create({
    data: {
      code,
      name: 'E2E Public Tournament',
      status: 'LIVE',
      organizerId: organizer.id,
      players: {
        create: [
          { name: 'Alice', seed: 1 },
          { name: 'Bob', seed: 2 },
        ],
      },
    },
  });
  tournamentId = tournament.id;

  const players = await prisma.player.findMany({
    where: { tournamentId },
    orderBy: { seed: 'asc' },
  });
  const [playerA, playerB] = players;
  if (!playerA || !playerB) throw new Error('E2E fixture players were not created');
  playerToken = playerA.token;

  await prisma.match.create({
    data: {
      id: `e2e_${code}_match`,
      tournamentId,
      round: 1,
      position: 1,
      bracketSide: 'WINNERS',
      playerAId: playerA.id,
      playerBId: playerB.id,
    },
  });
});

test.afterAll(async () => {
  if (tournamentId) await prisma.tournament.delete({ where: { id: tournamentId } });
  if (organizerId) await prisma.user.delete({ where: { id: organizerId } });
  await prisma.$disconnect();
});

test.describe('Live public tournament', () => {
  test('renders a persisted match and keeps player IDs private', async ({ page, request }) => {
    await page.goto(`/t/${code}`);
    await expect(page.getByRole('heading', { name: 'E2E Public Tournament' })).toBeVisible();
    await expect(page.getByText('Alice')).toBeVisible();
    await expect(page.getByText('Bob')).toBeVisible();

    const response = await request.get(`/api/t/${code}`);
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as {
      data: {
        matches: [{ playerA: { name: string }; playerB: { name: string } }];
      };
    };
    expect(body.data.matches[0]).toMatchObject({
      playerA: { name: 'Alice' },
      playerB: { name: 'Bob' },
    });
    expect(body.data.matches[0]?.playerA).not.toHaveProperty('id');
    expect(body.data.matches[0]?.playerB).not.toHaveProperty('id');
  });

  test('enables score reporting only for the matching player token', async ({ page }) => {
    await page.goto(`/t/${code}?token=${encodeURIComponent(playerToken)}`);
    await expect(page.getByRole('button', { name: /report score/i })).toBeVisible();
  });
});
