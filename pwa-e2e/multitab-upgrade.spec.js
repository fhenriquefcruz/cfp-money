import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

// Simula duas versões do Service Worker no servidor local do Playwright.
// Firebase real não é acessado: a suíte usa VITE_E2E_MODE.
const workerFile = resolve('dist/sw.js')

function getControlled(page) {
  return page.evaluate(() => Boolean(navigator.serviceWorker.controller))
}

function hasWaitingUpdate(page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    return Boolean(registration?.waiting)
  })
}

async function waitForControlledPage(page) {
  const assertion = expect.poll(() => getControlled(page).catch(() => false), {
    timeout: 30_000,
  })
  await assertion.toBe(true)
}

async function readyForControlledPwa(page, route) {
  await page.addInitScript(() => localStorage.setItem('cfp_onboarding_done_e2e-user', '1'))
  await page.goto(`./#${route}`, { waitUntil: 'domcontentloaded' })
  await waitForControlledPage(page)
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

    // Rascunho não salvo na interface; sem mutações no banco de produção.
    await second.getByRole('button', { name: 'Nova', exact: true }).click()
    const draft = second.getByRole('dialog', { name: 'Nova transação' })
    const description = draft.getByRole('textbox', { name: 'Descrição', exact: true })
    const amount = draft.locator('#transaction-amount')
    await expect(draft).toBeVisible()
    await amount.fill('12345')
    await description.fill('Rascunho PWA sem salvar')
    await second.evaluate(() => {
      window.__pwaDraftMarker = 'mantido-entre-abas'
    })

    await context.setOffline(true)
    await expect(amount).toHaveValue('123,45')
    await expect(description).toHaveValue('Rascunho PWA sem salvar')
    await context.setOffline(false)

    // Uma versão nova é servida no mesmo escopo, sem ativação forçada.
    await writeFile(workerFile, updatedWorker)
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      await registration.update()
    })
    await expect.poll(() => hasWaitingUpdate(page), { timeout: 30_000 }).toBe(true)

    await expect(page.getByText('Nova versão disponível')).toBeVisible()
    await expect(amount).toHaveValue('123,45')
    await expect(description).toHaveValue('Rascunho PWA sem salvar')

    // Confirmar na primeira aba não pode recarregar a segunda com rascunho.
    await page.getByRole('button', { name: 'Atualizar agora' }).click()
    await expect(second.getByText('Atualização ativada em outra aba')).toBeVisible()
    expect(await second.evaluate(() => window.__pwaDraftMarker)).toBe('mantido-entre-abas')
    await expect(amount).toHaveValue('123,45')
    await expect(description).toHaveValue('Rascunho PWA sem salvar')

    // O usuário descarta o rascunho antes de recarregar a segunda aba.
    await draft.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(draft).toBeHidden()
    await second.getByRole('button', { name: 'Recarregar quando estiver pronto' }).click()
    await expect(second.locator('main')).toBeVisible()
    await waitForControlledPage(second)
  } finally {
    await context.setOffline(false)
    await writeFile(workerFile, originalWorker)
    await second.close().catch(() => {})
  }
})
