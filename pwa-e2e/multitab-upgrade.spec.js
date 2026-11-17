import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

// A troca do script no dist em execução simula duas versões do MESMO PWA.
// Não modifica dados de produção nem usa o backend financeiro real (VITE_E2E_MODE).
const workerFile = resolve('dist/sw.js')
const getControlled = async (page) => page.evaluate(() => Boolean(navigator.serviceWorker.controller))

async function readyForControlledPwa(page, route) {
  await page.addInitScript(() => localStorage.setItem('cfp_onboarding_done_e2e-user', '1'))
  await page.goto(`./#${route}`, { waitUntil: 'domcontentloaded' })
  await expect.poll(() => getControlled(page).catch(() => false), { timeout: 30_000 }).toBe(true)
  await expect(page.locator('main')).toBeVisible()
}

test('PWA: duas abas preservam rascunho na atualização', async ({ page, context }) => {
  test.setTimeout(120_000)
  const originalWorker = await readFile(workerFile, 'utf8')
  const version = originalWorker.match(/const SW_VERSION = 'phase20-([a-f0-9]{12})'/)?.[1]
  expect(version, 'Build precisa gerar Service Worker versionado').toBeTruthy()
  const updatedVersion = `${version.slice(0, 11)}${version[11] === 'f' ? 'e' : 'f'}`
  const updatedWorker = originalWorker.replace(
    `const SW_VERSION = 'phase20-${version}'`,
    `const SW_VERSION = 'phase20-${updatedVersion}'`,
  )
  expect(updatedWorker).not.toBe(originalWorker)

  const second = await context.newPage()
  try {
    await readyForControlledPwa(page, '/dashboard')
    await readyForControlledPwa(second, '/transactions')

    // Segunda aba representa lançamento REAL na interface, mas só em memória E2E.
    await second.getByRole('button', { name: 'Nova', exact: true }).click()
    const draft = second.getByRole('dialog', { name: 'Nova transação' })
    await expect(draft).toBeVisible()
    await draft.locator('#transaction-amount').fill('12345')
    await draft
      .getByRole('textbox', { name: 'Descrição', exact: true })
      .fill('Rascunho PWA sem salvar')
    await second.evaluate(() => {
      window.__pwaDraftMarker = 'mantido-entre-abas'
    })

    await context.setOffline(true)
    await expect(draft.locator('#transaction-amount')).toHaveValue('123,45')
    await expect(
      draft.getByRole('textbox', { name: 'Descrição', exact: true }),
    ).toHaveValue('Rascunho PWA sem salvar')
    await context.setOffline(false)

    // A versão antiga continua controlando ambas as abas até decisão explícita.
    await writeFile(workerFile, updatedWorker)
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      await registration.update()
    })

    await expect.poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration()
          return Boolean(registration?.waiting)
        }),
      { timeout: 30_000 },
    ).toBe(true)

    await expect(page.getByText('Nova versão disponível')).toBeVisible()
    await expect(draft.locator('#transaction-amount')).toHaveValue('123,45')
    await expect(
      draft.getByRole('textbox', { name: 'Descrição', exact: true }),
    ).toHaveValue('Rascunho PWA sem salvar')

    // Aceitação ocorre na primeira aba; a segunda não pode descartar a edição.
    await page.getByRole('button', { name: 'Atualizar agora' }).click()
    await expect(second.getByText('Atualização ativada em outra aba')).toBeVisible()
    expect(await second.evaluate(() => window.__pwaDraftMarker)).toBe('mantido-entre-abas')
    await expect(draft.locator('#transaction-amount')).toHaveValue('123,45')
    await expect(
      draft.getByRole('textbox', { name: 'Descrição', exact: true }),
    ).toHaveValue('Rascunho PWA sem salvar')

    // Somente depois de descartar conscientemente o rascunho, a segunda aba recarrega.
    await draft.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(draft).toBeHidden()
    await second.getByRole('button', { name: 'Recarregar quando estiver pronto' }).click()
    await expect(second.locator('main')).toBeVisible()
    await expect.poll(() => getControlled(second).catch(() => false), {
      timeout: 30_000,
    }).toBe(true)
  } finally {
    await context.setOffline(false)
    await writeFile(workerFile, originalWorker)
    await second.close().catch(() => {})
  }
})
