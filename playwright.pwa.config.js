import { defineConfig, devices } from '@playwright/test'

const firebaseTestEnv = {
  VITE_E2E_MODE: 'true',
  VITE_FIREBASE_API_KEY: 'test-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'test-project',
  VITE_FIREBASE_STORAGE_BUCKET: 'test-project.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  VITE_FIREBASE_APP_ID: '1:123456789:web:test',
}

export default defineConfig({
  testDir: './pwa-e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-pwa-report', open: 'never' }]],
  outputDir: 'test-results-pwa',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4180/cfp-money/',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4180',
    url: 'http://127.0.0.1:4180/cfp-money/',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      ...firebaseTestEnv,
    },
  },
  projects: [
    {
      name: 'pwa-chromium',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
      },
    },
  ],
})
