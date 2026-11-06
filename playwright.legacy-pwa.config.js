import { defineConfig, devices } from '@playwright/test'

const appUrl = 'http://127.0.0.1:4182/cfp-money/'

export default defineConfig({
  testDir: './pwa-e2e',
  testMatch: '**/legacy-upgrade.spec.js',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-legacy-pwa-report', open: 'never' }]],
  outputDir: 'test-results-legacy-pwa',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: appUrl,
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-pwa-release-matrix.mjs',
    url: appUrl,
    reuseExistingServer: false,
    timeout: 15_000,
  },
  projects: [
    {
      name: 'legacy-to-candidate-chromium',
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
  ],
})
