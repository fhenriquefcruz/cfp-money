import { expect, test } from '@playwright/test'
import { join } from 'node:path'
import { prepareE2EPage } from './support'

test('rotas financeiras carregam sem exceções JavaScript', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  for (const route of [
    '/dashboard',
    '/transactions',
    '/cards',
    '/savings',
    '/budgets',
    '/goals',
    '/reports',
    '/money',
    '/categories',
    '/profile',
  ]) {
    await prepareE2EPage(page, route)
    await expect(page.locator('main')).toBeVisible()
    if (process.env.P0_CAPTURE_DIR && ['/dashboard', '/transactions', '/cards'].includes(route)) {
      await page.screenshot({
        path: join(process.env.P0_CAPTURE_DIR, `${route.slice(1)}-after.png`),
        fullPage: true,
      })
    }
  }

  expect(errors).toEqual([])
})
