import { defineConfig, devices } from '@playwright/test';

const webUrl = process.env.PELADA_WEB_URL ?? 'http://localhost:4200';
const chromePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  timeout: process.env.CI ? 240_000 : 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: webUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  ...(chromePath ? { launchOptions: { executablePath: chromePath } } : {}),
    ...devices['Pixel 5'],
  },
  globalSetup: './global-setup.ts',
});
