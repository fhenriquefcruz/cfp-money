import { expect, test } from '@playwright/test'
import { prepareE2EPage } from './support.js'

test('Dashboard abre a origem de uma categoria com filtros aplicados', async ({ page }) => {
  await prepareE2EPage(page, '/dashboard')
  await expect(page.locator('.dashboard-premium')).toBeVisible()

  const categoryLink = page.getByRole('link', { name: /Moradia:/i })
  await expect(categoryLink).toBeVisible()
  await categoryLink.click()

  await expect(page.locator('.transactions-premium')).toBeVisible()
  await expect(page).toHaveURL(/#\/transactions\?category=cat-home&from=\d{4}-\d{2}-01&to=\d{4}-\d{2}-\d{2}/)
  await expect(page.getByText('Aluguel', { exact: true })).toBeVisible()
  await expect(page.getByText('Compras do mercado', { exact: true })).toHaveCount(0)
})

test('Dashboard expõe dados acessíveis do gráfico e bloqueia 12 meses sem histórico suficiente', async ({
  page,
}) => {
  await prepareE2EPage(page, '/dashboard')

  const twelveMonths = page.getByRole('button', { name: '12 meses' })
  await expect(twelveMonths).toBeDisabled()

  await page.getByText('Ver dados do gráfico', { exact: true }).click()
  const table = page.getByRole('table')
  await expect(table).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Receitas' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Despesas' })).toBeVisible()
  await expect(table.getByRole('link', { name: 'Abrir' })).toHaveCount(6)
})
