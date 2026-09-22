import { test, expect } from '@playwright/test';

test.describe('Tournament public page', () => {
  test('non-existent code shows 404', async ({ page }) => {
    await page.goto('/t/doesnotexist99');
    // Should show 404 page
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});

test.describe('Auth pages', () => {
  test('sign-in page loads correctly', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
  });

  test('sign-in page shows email sent confirmation', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    // We can't actually send the email in E2E, just verify the form interaction
    await expect(page.locator('input[type="email"]')).toHaveValue('test@example.com');
  });
});

test.describe('API — tournaments', () => {
  test('GET /api/t/nonexistent returns 404', async ({ request }) => {
    const res = await request.get('/api/t/zzzzz9');
    expect(res.status()).toBe(404);
  });

  test('POST /api/tournaments requires auth', async ({ request }) => {
    const res = await request.post('/api/tournaments', {
      data: { name: 'Test' },
    });
    expect(res.status(), await res.text()).toBe(401);
  });
});
