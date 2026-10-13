import { expect, test } from '@playwright/test'
import { prepareE2EPage } from './support'

test.describe('Navegação mensal de Transações', () => {
  test('mostra o mês em foco e navega por setas', async ({ page }) => {
    await prepareE2EPage(page, '/transactions')

    const monthCard = page.getByText('Mês em foco').locator('..').locator('..')
    await expect(page.getByText('Mês em foco')).toBeVisible()

    const initialTitle = await monthCard.locator('p').nth(1).textContent()

    await page.getByRole('button', { name: 'Ver mês anterior' }).click()
    await expect(page.getByText('Mês em foco')).toBeVisible()

    const previousTitle = await monthCard.locator('p').nth(1).textContent()
    expect(previousTitle).not.toBe(initialTitle)

    await page.getByRole('button', { name: 'Ver próximo mês' }).click()
    await expect(monthCard.locator('p').nth(1)).toHaveText(initialTitle || '')
  })

  test('períodos amplos ficam dentro dos filtros e saem da barra principal', async ({ page }) => {
    await prepareE2EPage(page, '/transactions')

    await expect(page.getByRole('button', { name: 'Últimos 3 meses' })).toHaveCount(0)
    await page.getByRole('button', { name: /Filtros/ }).click()

    const period = page.getByLabel('Período')
    await expect(period).toBeVisible()
    await period.selectOption('last_3_months')

    await expect(page.getByText('Período filtrado')).toBeVisible()
    await expect(page.getByText('Últimos 3 meses').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Voltar à navegação mensal' })).toBeVisible()
  })
})
