import { PrismaClient } from '@prisma/client';
import { encode } from 'next-auth/jwt';
import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';

const prisma = new PrismaClient();
const suffix = randomBytes(4).toString('hex');
const email = `e2e-auth-${suffix}@example.com`;
const tournamentName = `Authenticated E2E ${suffix}`;
const secret = process.env['NEXTAUTH_SECRET'] ?? 'brats-e2e-secret';
let organizerId: string;
let sessionToken: string;

test.beforeAll(async () => {
  const organizer = await prisma.user.create({
    data: { email, name: 'Authenticated E2E Organizer' },
  });
  organizerId = organizer.id;
  sessionToken = await encode({
    secret,
    token: { id: organizer.id, sub: organizer.id, email: organizer.email },
  });
});

test.afterAll(async () => {
  if (organizerId) await prisma.user.delete({ where: { id: organizerId } });
  await prisma.$disconnect();
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: sessionToken,
      url: 'http://localhost:3000',
    },
  ]);
});

test('creates a tournament from the authenticated dashboard', async ({ page }) => {
  const apiErrors: string[] = [];
  const navigationErrors: string[] = [];
  page.on('response', async (response) => {
    if (response.url().includes('/api/tournaments') && !response.ok()) {
      apiErrors.push(`${response.status()} ${await response.text()}`);
    }
    if (response.url().includes('/t/') && response.status() >= 400) {
      navigationErrors.push(`${response.status()} ${await response.text()}`);
    }
  });
  page.on('pageerror', (error) => navigationErrors.push(`pageerror: ${error.message}`));

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.getByLabel('Tournament name').fill(tournamentName);
  await page.locator('textarea').fill('Alice\nBob');
  await page.getByRole('button', { name: /generate bracket/i }).click();

  if (apiErrors.length > 0) {
    throw new Error(`Tournament API request failed: ${apiErrors.join(' | ')}`);
  }
  if (navigationErrors.length > 0) {
    throw new Error(`Tournament page failed: ${navigationErrors.join(' | ')}`);
  }
  await expect(page).toHaveURL(/\/t\/[a-z0-9]{6}/);
  await expect(page.getByRole('heading', { name: tournamentName })).toBeVisible();
  await expect(page.getByText('Alice')).toBeVisible();
  await expect(page.getByText('Bob')).toBeVisible();
});
