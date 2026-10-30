import { expect, test } from '@playwright/test'
import { prepareE2EPage, expectNoHorizontalOverflow } from './support'

test('abre auditoria somente leitura dos dados já carregados e fecha sem alterar a fatura', async ({
  page,
}) => {
  await page.addInitScript(() => window.sessionStorage.setItem('cfp_e2e_reconcile', '1'))
  await prepareE2EPage(page, '/cards')
  await page.getByRole('button', { name: 'Mês atual' }).click()

  const summary = page.locator('.credit-cards-summary-grid')
  const before = await summary.innerText()
  const auditButton = page.getByRole('button', { name: 'Auditar valores' })
  await expect(auditButton).toBeVisible()
  await auditButton.click()

  const modal = page.getByRole('dialog', { name: 'Conferência financeira dos cartões' })
  await expect(modal).toBeVisible()
  await expect(modal.getByLabel('Resultado da auditoria financeira')).toBeVisible()
  await expect(modal).toContainText('2 vínculos salvos')
  await expect(modal).toContainText('1 compras sem cartão')
  await expect(modal).toContainText('Compras sem cartão salvo')
  await expect(modal).toContainText('Nenhum lançamento é')
  await expect(modal).not.toContainText('Compra antiga de homologação')
  await expect(modal).not.toContainText('card-nubank')
  await expect(summary).toHaveText(before)

  await modal.getByRole('button', { name: 'Concluir conferência' }).click()
  await expect(modal).toHaveCount(0)
  await expect(summary).toHaveText(before)
})

test('auditoria de cartões cabe na largura de celular sem alterar fatura', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareE2EPage(page, '/cards')
  await page.getByRole('button', { name: 'Auditar valores' }).click()
  const modal = page.getByRole('dialog', { name: 'Conferência financeira dos cartões' })
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('Cálculo sobre dados carregados')
  await expectNoHorizontalOverflow(page)
  await modal.getByRole('button', { name: 'Concluir conferência' }).click()
  await expect(modal).toHaveCount(0)
})
