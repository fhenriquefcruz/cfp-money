import { expect, test } from '@playwright/test'
import { prepareE2EPage } from './support'

test('concilia compra antiga após duas confirmações e desfaz sem duplicar fatura', async ({
  page,
}) => {
  await page.addInitScript(() => window.sessionStorage.setItem('cfp_e2e_reconcile', '1'))
  await prepareE2EPage(page, '/cards')

  const summary = page.locator('.credit-cards-summary-grid')
  await page.getByRole('button', { name: 'Mês atual' }).click()
  await expect(summary).toContainText('0,00')

  const diagnostic = page.locator('p[aria-label="Diagnóstico de integridade dos cartões"]')
  await expect(diagnostic).toContainText('2 salvos')
  await expect(diagnostic).toContainText('1 sem cartão')

  await page.getByRole('button', { name: 'Conciliar compras' }).click()
  const modal = page.getByRole('dialog', { name: 'Conciliar compras antigas' })
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('1 compra para revisar')
  await expect(modal).toContainText('Compra antiga de homologação')

  const reviewButton = modal.getByRole('button', { name: 'Revisar e vincular' })
  await expect(reviewButton).toBeDisabled()
  await modal.getByLabel('Cartão ao qual esta compra pertence').selectOption('card-nubank')

  await expect(modal).toContainText('92,41')
  await expect(modal).toContainText('Fatura de destino')
  await reviewButton.click()
  await expect(modal.getByRole('button', { name: 'Confirmar vínculo desta compra' })).toBeVisible()
  await expect(summary).toContainText('0,00')

  await modal.getByRole('button', { name: 'Confirmar vínculo desta compra' }).click()
  await expect(modal).toContainText('0 compras para revisar')
  await expect(summary).toContainText('92,41')
  await expect(diagnostic).toContainText('3 salvos')
  await expect(diagnostic).toContainText('0 sem cartão')

  const undoButton = modal.getByRole('button', { name: 'Desfazer vínculo' })
  await undoButton.click()
  await expect(modal.getByRole('button', { name: 'Confirmar desfazer' })).toBeVisible()
  await expect(summary).toContainText('92,41')
  await modal.getByRole('button', { name: 'Confirmar desfazer' }).click()

  await expect(modal).toContainText('1 compra para revisar')
  await expect(summary).toContainText('0,00')
  await expect(modal.getByRole('button', { name: 'Desfazer vínculo' })).toHaveCount(0)
  await expect(diagnostic).toContainText('2 salvos')
  await expect(diagnostic).toContainText('1 sem cartão')
})
