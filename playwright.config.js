import { defineConfig, devices } from '@playwright/test'

const publicBasePath = process.env.VITE_PUBLIC_BASE_PATH || '/cfp-money/'
const appUrl = `http://127.0.0.1:4177${publicBasePath}`

const firebaseTestEnv = {
  VITE_E2E_MODE: 'true',
  VITE_FIREBASE_API_KEY: 'test-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'test-project',
  VITE_FIREBASE_STORAGE_BUCKET: 'test-project.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  VITE_FIREBASE_APP_ID: '1:123456789:web:test',
}

const customMobile = (width, height) => ({
  ...devices['Pixel 5'],
  browserName: 'chromium',
  viewport: { width, height },
  screen: { width, height },
})

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: appUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4177',
    url: appUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      ...firebaseTestEnv,
    },
  },
  projects: [
    { name: 'mobile-320', use: customMobile(320, 740) },
    { name: 'mobile-360', use: customMobile(360, 800) },
    { name: 'mobile-390', use: customMobile(390, 844) },
    { name: 'mobile-430', use: customMobile(430, 932) },
    {
      name: 'android-pixel-5',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
      },
    },
    {
      name: 'iphone-13',
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
      },
    },
  ],
})
