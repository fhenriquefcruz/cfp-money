import { expect, test } from '@playwright/test'
import { prepareE2EPage } from './support'

test('compra 3x de novembro permanece visível nas faturas e no extrato de dezembro/janeiro', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390', 'Fluxo de gravação sintética em uma viewport.')

  await prepareE2EPage(page, '/transactions?month=2026-11')

  await page.getByRole('button', { name: 'Nova', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova transação' })
  await expect(dialog).toBeVisible()

  await dialog.locator('#transaction-amount').fill('10000')
  await dialog.getByLabel('Data', { exact: true }).fill('2026-11-04')
  await dialog.getByRole('textbox', { name: 'Descrição', exact: true }).fill('Compra 3x novembro E2E')
  await dialog.getByRole('button', { name: /Alimentação/ }).click()
  await dialog.getByLabel('Pagamento', { exact: true }).selectOption('credit_card')
  await dialog.getByLabel('Cartão cadastrado', { exact: true }).selectOption('card-nubank')
  await dialog.getByLabel('Parcelado', { exact: true }).check()
  await dialog.getByLabel('Número de parcelas', { exact: true }).fill('3')
  await expect(dialog.getByText('Parcelas nas próximas faturas')).toBeVisible()
  await expect(dialog.getByText('Fatura 11/2026', { exact: false })).toBeVisible()
  await expect(dialog.getByText('Fatura 12/2026', { exact: false })).toBeVisible()
  await expect(dialog.getByText('Fatura 01/2027', { exact: false })).toBeVisible()
  await dialog.getByRole('button', { name: 'Criar 3 parcelas' }).click()
  await expect(dialog).toBeHidden()

  const list = page.locator('.transaction-list-surface')
  await expect(page.getByRole('button', { name: 'Vencimentos' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(list.getByText('Compra 3x novembro E2E', { exact: true })).toHaveCount(1)

  await page.getByRole('button', { name: 'Ver próximo mês' }).click()
  await expect(list.getByText('Compra 3x novembro E2E', { exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Ver próximo mês' }).click()
  await expect(list.getByText('Compra 3x novembro E2E', { exact: true })).toHaveCount(1)

  await page.getByRole('button', { name: 'Compras', exact: true }).click()
  await expect(list.getByText('Compra 3x novembro E2E', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Vencimentos' }).click()
  await expect(list.getByText('Compra 3x novembro E2E', { exact: true })).toHaveCount(1)

  // O link do lançamento abre a competência exata sem recarregar o estado E2E.
  await list.getByRole('link', { name: /Abrir fatura de/ }).click()
  await expect(page.getByRole('heading', { name: 'Cartões e faturas' })).toBeVisible()
  const picker = page.getByLabel('Selecionar mês da fatura')
  await expect(picker).toHaveValue('2027-01')
  const cardMovements = page.locator('.credit-cards-premium__grid')
  for (const month of ['2026-11', '2026-12', '2027-01']) {
    await picker.fill(month)
    await expect(cardMovements).toContainText('Compra 3x novembro E2E')
  }
})
