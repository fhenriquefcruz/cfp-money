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
    const forecast = document.querySelector('.dashboard-forecast-card')?.getBoundingClientRect()
    const health = document.querySelector('.dashboard-health-card')?.getBoundingClientRect()
    const money = document.querySelector('.dashboard-money-insight')?.getBoundingClientRect()

    const compact = (rect) =>
      rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } : null

    return {
      forecast: compact(forecast),
      health: compact(health),
      money: compact(money),
    }
  })

  expect(geometry.forecast).not.toBeNull()
  expect(geometry.health).not.toBeNull()
  expect(geometry.money).not.toBeNull()

  if (projectName === 'visual-desktop-chromium') {
    expect(Math.abs(geometry.forecast.top - geometry.health.top)).toBeLessThanOrEqual(2)
    expect(Math.abs(geometry.forecast.top - geometry.money.top)).toBeLessThanOrEqual(2)
    expect(geometry.forecast.right).toBeLessThanOrEqual(geometry.health.left)
    expect(geometry.health.right).toBeLessThanOrEqual(geometry.money.left)
    return
  }

  expect(Math.abs(geometry.forecast.top - geometry.health.top)).toBeLessThanOrEqual(2)
  expect(geometry.money.top).toBeGreaterThan(
    Math.max(geometry.forecast.bottom, geometry.health.bottom),
  )
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
      await expectDashboardPremiumVisualization(page, testInfo.project.name)
    }

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
