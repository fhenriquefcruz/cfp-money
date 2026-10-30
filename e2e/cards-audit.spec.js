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

  const audit = page.getByRole('region', { name: 'Resultado da auditoria financeira' })
  await expect(audit).toBeVisible()
  await expect(audit).toContainText('2 vínculos salvos')
  await expect(audit).toContainText('Compras sem cartão salvo')
  await expect(audit).toContainText('Nenhum lançamento é')
  await expect(audit).not.toContainText('Compra antiga de homologação')
  await expect(audit).not.toContainText('card-nubank')
  expect(await summary.innerText()).toBe(before)

  await audit.getByRole('button', { name: 'Concluir conferência' }).click()
  await expect(audit).toHaveCount(0)
  expect(await summary.innerText()).toBe(before)
})

test('auditoria de cartões cabe na largura de celular sem alterar fatura', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareE2EPage(page, '/cards')
  await page.getByRole('button', { name: 'Auditar valores' }).click()
  const audit = page.getByRole('region', { name: 'Resultado da auditoria financeira' })
  await expect(audit).toBeVisible()
  await expect(audit).toContainText('Cálculo sobre dados carregados')
  await expectNoHorizontalOverflow(page)
  await audit.getByRole('button', { name: 'Concluir conferência' }).click()
  await expect(audit).toHaveCount(0)
})
