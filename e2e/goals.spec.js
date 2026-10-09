import { test, expect } from '@playwright/test'
import { prepareE2EPage } from './support'

test.describe('Metas e Poupança integradas', () => {
  test('edita uma meta por ação visível e persiste a alteração na interface', async ({ page }) => {
    await prepareE2EPage(page, '/goals')

    await page.getByRole('button', { name: 'Editar meta Entrada do carro' }).click()

    const dialog = page.getByRole('dialog', { name: 'Editar meta' })
    await expect(dialog).toBeVisible()

    const nameInput = dialog.getByLabel('Nome da meta')
    await expect(nameInput).toHaveValue('Entrada do carro')
    await nameInput.fill('Entrada do carro 2027')

    await dialog.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page.getByText('Entrada do carro 2027')).toBeVisible()
    await expect(dialog).toBeHidden()
  })

  test('aporte da meta vira movimento de poupança e atualiza o progresso', async ({ page }) => {
    await prepareE2EPage(page, '/goals')

    const goalCard = page.locator('.goals-card-grid .aurora-card').filter({
      hasText: 'Entrada do carro',
    })

    await expect(goalCard).toContainText('R$ 20.000,00')
    await goalCard.getByRole('button', { name: 'Registrar aporte' }).click()

    const dialog = page.getByRole('dialog', { name: /Aporte em Entrada do carro/i })
    await dialog.getByLabel('Valor do aporte (R$)').fill('500')
    await dialog.getByLabel('Onde o dinheiro ficará?').fill('Caixinha do carro')
    await dialog.getByLabel('Instituição (opcional)').fill('Nubank')
    await dialog.getByRole('button', { name: 'Confirmar aporte' }).click()

    await expect(dialog).toBeHidden()
    await expect(goalCard).toContainText('R$ 20.500,00')
  })
})
