import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PRODUCTION_BASE_URL

if (!baseURL) {
  throw new Error('PRODUCTION_BASE_URL é obrigatório para o smoke test de produção.')
}

export default defineConfig({
  testDir: './e2e/production',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-production-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'production-desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'production-mobile-chromium',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        screen: { width: 390, height: 844 },
      },
    },
  ],
})
