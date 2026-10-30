import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, prepareE2EPage } from './support'

test('Dashboard Bento preserva mês, ações e filtros sem alterar dados', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepareE2EPage(page, '/dashboard')
  const dashboard = page.locator('[data-tour="dashboard"]')
  await expect(dashboard).toBeVisible()
  await expect(dashboard.locator('.dashboard-bento-topbar')).toBeVisible()
  await expect(dashboard.getByText('Resultado do período')).toBeVisible()
  await expect(dashboard.getByText('Saúde & Money')).toBeVisible()
  await expect(dashboard.getByText('Controle de pagamentos')).toBeVisible()

  const width = await dashboard.evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
  )
  expect(width).toBe(12)

  const currentPeriod = await dashboard.locator('.dashboard-bento-month-nav h1').innerText()
  await page.getByRole('button', { name: 'Visualizar mês anterior' }).click()
  await expect(dashboard.locator('.dashboard-bento-month-nav h1')).not.toHaveText(currentPeriod)

  const toggle = dashboard.getByRole('switch', { name: 'Apenas meus gastos' })
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')

  await dashboard.getByRole('button', { name: 'Recorrentes' }).click()
  await expect(dashboard.getByRole('button', { name: 'Recorrentes' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await dashboard.getByRole('button', { name: 'Todos', exact: true }).click()
  await expectNoHorizontalOverflow(page)
})

test('Dashboard Bento encaixa feed e barra de ações em celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareE2EPage(page, '/dashboard')
  const dashboard = page.locator('[data-tour="dashboard"]')
  await expect(dashboard.getByRole('link', { name: /Nova transação/i })).toBeVisible()
  await expect(dashboard.getByRole('switch', { name: 'Apenas meus gastos' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
