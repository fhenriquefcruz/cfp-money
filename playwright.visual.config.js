import { defineConfig, devices } from '@playwright/test'

const publicBasePath = process.env.VITE_PUBLIC_BASE_PATH || '/cfp-money/'
const previewBasePath = publicBasePath === './' ? '/' : publicBasePath
const appUrl = `http://127.0.0.1:4179${previewBasePath}`

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
  testDir: './e2e/visual',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.002,
    },
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-visual-report', open: 'never' }]],
  use: {
    baseURL: appUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    colorScheme: 'light',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4179',
    url: appUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      ...firebaseTestEnv,
    },
  },
  projects: [
    {
      name: 'visual-desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'visual-mobile-chromium',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        screen: { width: 390, height: 844 },
      },
    },
  ],
})
