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

test('seleção manual do mês atual não esconde a fatura do mês seguinte', async ({ page }) => {
  await prepareE2EPage(page, '/cards')

  const summary = page.locator('.credit-cards-summary-grid')
  await expect(summary).toContainText('904,63')

  await page.getByRole('button', { name: 'Mês atual' }).click()
  await expect(summary).toContainText('0,00')

  await page.getByRole('button', { name: 'Fatura do próximo mês' }).click()
  await expect(summary).toContainText('904,63')
})

test('histórico por cartão permanece visível quando a fatura selecionada está vazia', async ({
  page,
}) => {
  await prepareE2EPage(page, '/cards')

  const invoices = page.locator('.credit-cards-premium__grid')
  await expect(invoices).toContainText('Nubank')

  const historyTotals = async () => {
    const labels = await invoices
      .locator('p')
      .filter({ hasText: 'Histórico:' })
      .allTextContents()
    return labels
      .map((label) => label.match(/Histórico:\s*(R\$\s*[\d.,]+)/)?.[1])
      .filter(Boolean)
  }

  const before = await historyTotals()
  expect(before.length).toBeGreaterThan(0)
  expect(before.some((value) => !/R\$\s*0,00$/.test(value))).toBe(true)

  await page.getByRole('button', { name: 'Mês atual' }).click()
  await expect(page.locator('.credit-cards-summary-grid')).toContainText('0,00')
  await expect.poll(historyTotals).toEqual(before)
})
