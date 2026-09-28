import { expect, test } from '@playwright/test'
import { prepareE2EPage } from '../support.js'

const FIXED_TIME = new Date('2026-09-15T12:00:00-04:00')

const ROUTES = [
  ['dashboard', '/dashboard', '.dashboard-premium'],
  ['money', '/money', '.money-premium'],
  ['cards', '/cards', '.credit-cards-premium'],
  ['transactions', '/transactions', '.transactions-premium'],
  ['categories', '/categories', '.categories-premium'],
  ['goals', '/goals', '.goals-premium'],
  ['budgets', '/budgets', '.budgets-premium'],
  ['reports', '/reports', '.reports-premium'],
  ['profile', '/profile', '.profile-premium'],
]

async function prepareVisualPage(page, route, selector) {
  await page.clock.install({ time: FIXED_TIME })
  await prepareE2EPage(page, route)
  await expect(page.locator(selector)).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
}

for (const [name, route, selector] of ROUTES) {
  test(`${name} mantém baseline visual`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, route, selector)

    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.002,
    })

    await testInfo.attach(`${name}-viewport`, {
      body: Buffer.from(
        JSON.stringify(
          {
            project: testInfo.project.name,
            viewport: page.viewportSize(),
            route,
            fixedTime: FIXED_TIME.toISOString(),
          },
          null,
          2,
        ),
      ),
      contentType: 'application/json',
    })
  })
}
