import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, prepareE2EPage } from './support'

test('Dashboard v2 abre criação em um clique e restaura foco ao fechar', async ({ page }) => {
  await prepareE2EPage(page, '/dashboard')

  const trigger = page.getByRole('button', { name: 'Nova transação', exact: true })
  await expect(trigger).toBeVisible()
  await trigger.focus()
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Nova transação' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('#transaction-amount')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await expectNoHorizontalOverflow(page)
})

test('Dashboard v2 identifica o recorte até hoje e mês completo sem gravar dados', async ({
  page,
}) => {
  await prepareE2EPage(page, '/dashboard')

  const scope = page.getByRole('group', { name: 'Recorte temporal do resultado' })
  const toDate = scope.getByRole('button', { name: 'Até hoje' })
  const fullMonth = scope.getByRole('button', { name: 'Mês completo' })

  await expect(toDate).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Somente datas de atividade até o corte')).toBeVisible()

  await fullMonth.click()
  await expect(fullMonth).toHaveAttribute('aria-pressed', 'true')
  await expect(toDate).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Inclui lançamentos futuros já cadastrados')).toBeVisible()

  await toDate.click()
  await expect(toDate).toHaveAttribute('aria-pressed', 'true')
  await expectNoHorizontalOverflow(page)
})

test('Dashboard v2 organiza quatro áreas e recolhe análises sem perder atalhos', async ({
  page,
}) => {
  await prepareE2EPage(page, '/dashboard')

  await expect(page.getByRole('region', { name: 'Situação do mês' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Próximas ações' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Planejamento do mês' })).toBeVisible()
  const expand = page.getByRole('button', { name: 'Explorar análises' })
  await expect(expand).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#dashboard-explore-content')).toHaveCount(0)

  await expand.click()
  await expect(page.getByRole('button', { name: 'Ocultar análises' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(page.getByRole('heading', { name: 'Evolução financeira' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quem lidera os gastos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Metas', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Ocultar análises' }).click()
  await expect(page.locator('#dashboard-explore-content')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
})

test('Dashboard v2 mostra mês completo ao navegar para passado e futuro', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-12T12:00:00-04:00') })
  await prepareE2EPage(page, '/dashboard')
  const scope = page.getByRole('group', { name: 'Recorte temporal do resultado' })
  const toDate = scope.getByRole('button', { name: 'Até hoje' })
  const fullMonth = scope.getByRole('button', { name: 'Mês completo' })

  await expect(toDate).toBeEnabled()
  await page.getByRole('button', { name: 'Visualizar próximo mês' }).click()
  await expect(toDate).toBeDisabled()
  await expect(fullMonth).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Mostra os lançamentos cadastrados para todo o mês')).toBeVisible()

  await page.getByRole('button', { name: 'Visualizar mês anterior' }).click()
  await expect(toDate).toBeEnabled()
  await expect(toDate).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Visualizar mês anterior' }).click()
  await expect(toDate).toBeDisabled()
  await expect(fullMonth).toHaveAttribute('aria-pressed', 'true')
  await expectNoHorizontalOverflow(page)
})

test('Dashboard v2 exibe uso das receitas compacto no celular sem ocultar o valor', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareE2EPage(page, '/dashboard')

  await expect(page.locator('.dashboard-period-hero__signal')).toBeHidden()
  await expect(page.getByText(/Uso das receitas:/)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Próximas ações' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('Dashboard v2 mantém prioridades e exploração operáveis em larguras reduzidas', async ({
  page,
}) => {
  await prepareE2EPage(page, '/dashboard')

  for (const width of [320, 360, 390, 768]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(page.getByRole('button', { name: 'Nova transação', exact: true })).toBeVisible()

    const priority = page.getByRole('region', { name: 'Próximas ações' })
    await expect(priority).toBeVisible()
    expect(await priority.locator('.dashboard-attention-card__item').count()).toBeLessThanOrEqual(2)

    const expand = page.getByRole('button', { name: 'Explorar análises' })
    await expand.click()
    await expect(page.getByRole('heading', { name: 'Evolução financeira' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Ocultar análises' }).click()
    await expectNoHorizontalOverflow(page)
  }
})
