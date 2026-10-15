import { expect, test } from '@playwright/test'
import { prepareE2EPage } from './support'

test('Central de Cartões consolida compras vinculadas nas Transações', async ({ page }) => {
  await prepareE2EPage(page, '/cards')

  await expect(page.getByRole('heading', { name: 'Cartões e faturas' })).toBeVisible()
  await expect(page.getByText('Compras do mercado', { exact: true })).toBeVisible()
  await expect(page.getByText('Combustível', { exact: true })).toBeVisible()

  const summary = page.locator('.credit-cards-summary-grid')
  await expect(summary.getByText('Total das faturas', { exact: true })).toBeVisible()
  await expect(summary).toContainText('904,63')

  const invoices = page.locator('.credit-cards-premium__grid')
  await expect(invoices).toContainText('Nubank')
  await expect(invoices).toContainText('2 lançamentos')
})

test('Central de Cartões avança do mês vazio para a primeira fatura com lançamentos', async ({
  page,
}) => {
  await prepareE2EPage(page, '/cards')

  await expect(page.getByText('Compras do mercado', { exact: true })).toBeVisible()
  await expect(page.getByText('Combustível', { exact: true })).toBeVisible()
  await expect(page.getByText('Nenhuma compra nesta fatura')).toBeHidden()
})
