import { test, expect } from '@playwright/test'
import {
  expectElementInsideViewport,
  expectNavigationControlsInsideViewport,
  expectNoHorizontalOverflow,
  goToRoute,
  prepareE2EPage,
} from './support'

const routes = [
  ['/dashboard', '.dashboard-premium'],
  ['/money', '.money-premium'],
  ['/cards', '.credit-cards-premium'],
  ['/transactions', '.transactions-premium'],
  ['/categories', '.categories-premium'],
  ['/goals', '.goals-premium'],
  ['/budgets', '.budgets-premium'],
  ['/reports', '.reports-premium'],
  ['/profile', '.profile-premium'],
]

test('principais telas permanecem contidas na largura móvel', async ({ page }) => {
  await prepareE2EPage(page)

  for (const [route, selector] of routes) {
    await test.step(route, async () => {
      await goToRoute(page, route, selector)
      await expectNoHorizontalOverflow(page)
    })
  }
})

test('navegação inferior e menu Mais continuam acessíveis', async ({ page }) => {
  await prepareE2EPage(page)

  const bottomNavigation = page.locator('.aurora-bottom-nav')
  await expect(bottomNavigation).toBeVisible()
  await expectNavigationControlsInsideViewport(bottomNavigation)

  await bottomNavigation.getByRole('button', { name: 'Mais', exact: true }).click()

  const drawer = page.getByRole('dialog', { name: 'Mais opções de navegação' })
  await expect(drawer).toBeVisible()
  await expectElementInsideViewport(drawer)

  await drawer.getByRole('link', { name: 'Relatórios' }).click()
  await expect(page).toHaveURL(/#\/reports$/)
  await expect(page.locator('.reports-premium')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('rotação retrato-paisagem não cria overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390', 'Cenário de rotação executado uma vez.')

  await prepareE2EPage(page, '/cards')
  await expect(page.locator('.credit-cards-premium')).toBeVisible()

  await page.setViewportSize({ width: 844, height: 390 })
  await page.waitForTimeout(180)
  await expectNoHorizontalOverflow(page)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(180)
  await expectNoHorizontalOverflow(page)
})
