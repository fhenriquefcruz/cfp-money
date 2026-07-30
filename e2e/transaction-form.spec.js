import { test, expect } from '@playwright/test'
import { expectNoHorizontalOverflow, prepareE2EPage } from './support'

async function openTransactionForm(page) {
  await prepareE2EPage(page, '/transactions')
  await page.getByRole('button', { name: 'Nova', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova transação' })
  await expect(dialog).toBeVisible()
  return dialog
}

test('formulário mantém foco, rolagem e rodapé visíveis com teclado simulado', async ({ page }) => {
  const dialog = await openTransactionForm(page)

  await dialog.locator('#transaction-amount').fill('68473')
  await dialog
    .getByRole('textbox', { name: 'Descrição', exact: true })
    .fill('Compra parcelada de homologação móvel')
  await dialog.getByRole('button', { name: /Alimentação/ }).click()
  await dialog.getByLabel('Pagamento', { exact: true }).selectOption('credit_card')
  await dialog.getByLabel('Cartão cadastrado', { exact: true }).selectOption('card-nubank')
  await dialog.getByLabel('Parcelado', { exact: true }).check()
  await dialog.getByLabel('Número de parcelas', { exact: true }).fill('6')

  const notes = dialog.getByLabel('Observações', { exact: true })
  await notes.focus()

  const originalViewport = page.viewportSize()
  const reducedHeight = Math.max(420, Math.floor(originalViewport.height * 0.62))
  await page.setViewportSize({ width: originalViewport.width, height: reducedHeight })

  let geometry = null

  await expect
    .poll(
      async () => {
        geometry = await notes.evaluate((element) => {
          const dialogElement = element.closest('[role="dialog"]')
          const scrollRegion = element.closest('[class~="overflow-y-auto"]')
          const footer = dialogElement?.lastElementChild
          const control = element.getBoundingClientRect()
          const region = scrollRegion?.getBoundingClientRect()
          const footerRect = footer?.getBoundingClientRect()
          const visualViewport = window.visualViewport
          const viewportTop = visualViewport?.offsetTop || 0
          const viewportHeight = visualViewport?.height || window.innerHeight
          const viewportBottom = viewportTop + viewportHeight
          const tolerance = 2

          return {
            controlTop: control.top,
            controlBottom: control.bottom,
            regionTop: region?.top ?? viewportTop,
            regionBottom: region?.bottom ?? viewportBottom,
            footerTop: footerRect?.top ?? viewportTop,
            footerBottom: footerRect?.bottom ?? viewportBottom,
            viewportTop,
            viewportBottom,
            activeIsNotes: document.activeElement === element,
            controlInside:
              control.top >= (region?.top ?? viewportTop) - tolerance &&
              control.bottom <= (region?.bottom ?? viewportBottom) + tolerance,
            footerInside:
              (footerRect?.top ?? viewportTop) >= viewportTop - tolerance &&
              (footerRect?.bottom ?? viewportBottom) <= viewportBottom + tolerance,
          }
        })

        return {
          activeIsNotes: geometry.activeIsNotes,
          controlInside: geometry.controlInside,
          footerInside: geometry.footerInside,
        }
      },
      {
        message: () =>
          `O modal não estabilizou após a redução da viewport. Geometria: ${JSON.stringify(
            geometry,
          )}`,
        timeout: 2_000,
      },
    )
    .toEqual({
      activeIsNotes: true,
      controlInside: true,
      footerInside: true,
    })

  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Criar 6 parcelas/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('nova transação é salva no modo E2E sem acessar o Firebase', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390', 'Persistência em memória executada uma vez.')

  const dialog = await openTransactionForm(page)
  await dialog.locator('#transaction-amount').fill('12345')
  await dialog
    .getByRole('textbox', { name: 'Descrição', exact: true })
    .fill('Transação E2E confirmada')
  await dialog.getByRole('button', { name: /Alimentação/ }).click()

  await dialog.getByRole('button', { name: 'Adicionar', exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByText('Transação E2E confirmada', { exact: true })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
