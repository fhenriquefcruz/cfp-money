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
  ['savings', '/savings', '.savings-premium'],
  ['budgets', '/budgets', '.budgets-premium'],
  ['reports', '/reports', '.reports-premium'],
  ['profile', '/profile', '.profile-premium'],
]

async function expectDashboardOperationalLayout(page, projectName) {
  const geometry = await page.evaluate(() => {
    const payments = document.querySelector('.payment-control-card')?.getBoundingClientRect()
    const savings = document.querySelector('.dashboard-savings-card')?.getBoundingClientRect()

    return {
      payments: payments
        ? { top: payments.top, bottom: payments.bottom, left: payments.left, right: payments.right }
        : null,
      savings: savings
        ? { top: savings.top, bottom: savings.bottom, left: savings.left, right: savings.right }
        : null,
    }
  })

  expect(geometry.payments).not.toBeNull()
  expect(geometry.savings).not.toBeNull()

  if (projectName === 'visual-desktop-chromium') {
    expect(Math.abs(geometry.payments.top - geometry.savings.top)).toBeLessThanOrEqual(2)
    expect(geometry.payments.right).toBeLessThanOrEqual(geometry.savings.left)
    return
  }

  expect(geometry.savings.top).toBeGreaterThan(geometry.payments.bottom)
}

async function expectDashboardPremiumVisualization(page, projectName) {
  const resultButton = page.getByRole('button', { name: 'Resultado', exact: true })
  const flowButton = page.getByRole('button', { name: 'Fluxo', exact: true })
  const chartAreas = page.locator('.dashboard-finance-chart .recharts-area-area')

  await expect(resultButton).toBeVisible()
  await resultButton.click()
  await expect(resultButton).toHaveAttribute('aria-pressed', 'true')
  await expect(chartAreas).toHaveCount(1)

  await flowButton.click()
  await expect(flowButton).toHaveAttribute('aria-pressed', 'true')
  await expect(chartAreas).toHaveCount(2)

  const geometry = await page.evaluate(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector)?.getBoundingClientRect()
      return value
        ? { top: value.top, bottom: value.bottom, left: value.left, right: value.right }
        : null
    }
    return {
      hero: rect('.dashboard-period-hero'),
      decisions: rect('.dashboard-decision-card'),
      payments: rect('.payment-control-card'),
      savings: rect('.dashboard-savings-card'),
      rhythm: rect('.dashboard-forecast-card'),
      analytics: rect('.dashboard-bento-analytics'),
      feed: rect('.dashboard-bento-feed'),
    }
  })

  Object.values(geometry).forEach((rect) => expect(rect).not.toBeNull())

  if (projectName === 'visual-desktop-chromium') {
    // 8:4, 5:4:3 e 7:5 no mesmo Bento Grid de doze colunas.
    expect(Math.abs(geometry.hero.top - geometry.decisions.top)).toBeLessThanOrEqual(2)
    expect(geometry.hero.right).toBeLessThanOrEqual(geometry.decisions.left)
    expect(Math.abs(geometry.payments.top - geometry.savings.top)).toBeLessThanOrEqual(2)
    expect(Math.abs(geometry.savings.top - geometry.rhythm.top)).toBeLessThanOrEqual(2)
    expect(Math.abs(geometry.analytics.top - geometry.feed.top)).toBeLessThanOrEqual(2)
    expect(geometry.analytics.right).toBeLessThanOrEqual(geometry.feed.left)
    return
  }

  expect(geometry.decisions.top).toBeGreaterThanOrEqual(geometry.hero.bottom)
  expect(geometry.savings.top).toBeGreaterThanOrEqual(geometry.payments.bottom)
  expect(geometry.feed.top).toBeGreaterThanOrEqual(geometry.analytics.bottom)
}

async function prepareVisualPage(page, route, selector) {
  await page.clock.install({ time: FIXED_TIME })
  await prepareE2EPage(page, route)
  await expect(page.locator(selector)).toBeVisible()

  if (route === '/goals') {
    await expect(
      page.locator('.goals-card-grid').getByText('Entrada do carro', { exact: true }),
    ).toBeVisible()
  }

  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
}

for (const [name, route, selector] of ROUTES) {
  test(`${name} mantém baseline visual`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, route, selector)

    if (name === 'dashboard') {
      await expectDashboardOperationalLayout(page, testInfo.project.name)
    }

    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.002,
    })

    if (name === 'dashboard') {
      await expectDashboardPremiumVisualization(page, testInfo.project.name)

      const chartGrid = page.locator('.dashboard-chart-grid:has(.dashboard-finance-chart)')
      await chartGrid.scrollIntoViewIfNeeded()
      await expect(chartGrid).toHaveScreenshot('dashboard-charts.png', {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.002,
      })
    }

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
