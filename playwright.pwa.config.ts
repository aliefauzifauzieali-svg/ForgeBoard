import { defineConfig, devices } from '@playwright/test';

/**
 * E2E do PWA contra o BUILD de produção (`preview`), onde o service
 * worker existe de verdade. Rode `npm run build` antes (o CI já faz).
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/pwa.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
})
