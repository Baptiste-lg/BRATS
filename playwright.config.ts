import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  ...(process.env['CI'] ? { workers: 1 } : {}),
  reporter: [
    ...(process.env['CI'] ? [['github'] as const] : []),
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: process.env['BASE_URL'] ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
    env: {
      DATABASE_URL:
        process.env['DATABASE_URL'] ?? 'postgresql://brats:brats@localhost:5432/brats',
      DIRECT_URL: process.env['DIRECT_URL'] ?? 'postgresql://brats:brats@localhost:5432/brats',
      NEXTAUTH_SECRET: process.env['NEXTAUTH_SECRET'] ?? 'brats-e2e-secret',
      NEXTAUTH_URL: process.env['NEXTAUTH_URL'] ?? 'http://localhost:3000',
      EMAIL_SERVER: process.env['EMAIL_SERVER'] ?? 'smtp://user:password@localhost:2525',
      EMAIL_FROM: process.env['EMAIL_FROM'] ?? 'BRATS <noreply@example.com>',
    },
  },
});
