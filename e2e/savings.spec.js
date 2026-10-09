import { expect, test } from '@playwright/test'
import { prepareE2EPage } from './support'

test.describe('Central de Poupança e Reservas', () => {
  test('mostra saldo, destino e meta vinculada', async ({ page }) => {
    await prepareE2EPage(page, '/savings')

    await expect(page.locator('.savings-premium')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Seu dinheiro guardado, em um só lugar' }),
    ).toBeVisible()
    await expect(page.getByText('Caixinha do carro').first()).toBeVisible()
    await expect(page.getByText('Nubank').first()).toBeVisible()
    await expect(page.getByText(/Entrada do carro/).first()).toBeVisible()
    await expect(page.getByText('R$ 1.500,00').first()).toBeVisible()
  })

  test('retirada rápida preserva o destino e reduz o total reservado', async ({ page }) => {
    await prepareE2EPage(page, '/savings')

    await page.getByRole('button', { name: 'Retirar de Caixinha do carro' }).click()

    const dialog = page.getByRole('dialog', { name: 'Nova transação' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Poupança' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(dialog.getByRole('button', { name: 'Retirar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(dialog.getByLabel('Onde está guardado?')).toHaveValue('Caixinha do carro')
    await expect(dialog.getByLabel('Instituição (opcional)')).toHaveValue('Nubank')
    await expect(dialog.getByLabel('Vincular a uma meta (opcional)')).toHaveValue('goal-car')

    await dialog.getByLabel(/Valor/).fill('25000')
    await dialog.getByRole('button', { name: 'Registrar retirada' }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText('R$ 1.250,00').first()).toBeVisible()
  })
})
