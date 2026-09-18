import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('displays the BRATS brand name', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=BRATS').first()).toBeVisible();
  });

  test('has a "Create a tournament" CTA link', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /create a tournament/i });
    await expect(cta).toBeVisible();
  });

  test('has a "Sign in" link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
  });

  test('CTA navigates to dashboard (redirect to sign-in if unauthenticated)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /create a tournament/i }).click();
    // Unauthenticated → should redirect to /auth/signin
    await expect(page).toHaveURL(/auth\/signin|dashboard/);
  });
});

test.describe('Health check', () => {
  test('GET /api/health returns 200 with status ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe('ok');
  });
});
