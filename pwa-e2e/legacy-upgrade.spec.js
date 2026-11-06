import { expect, test } from '@playwright/test'

async function readWorkerVersion(page, target = 'controller') {
  return page.evaluate(async (workerTarget) => {
    const registration = await navigator.serviceWorker.getRegistration()
    const worker =
      workerTarget === 'waiting' ? registration?.waiting : navigator.serviceWorker.controller
    if (!worker) return null

    return new Promise((resolve) => {
      const channel = new MessageChannel()
      const timeout = setTimeout(() => resolve(null), 2_000)
      channel.port1.onmessage = ({ data }) => {
        clearTimeout(timeout)
        channel.port1.close()
        resolve(data?.version || null)
      }
      worker.postMessage({ type: 'GET_VERSION' }, [channel.port2])
    })
  }, target)
}

test('atualiza um build real anterior sem substituir a aba até confirmação', async ({
  page,
  context,
  request,
}) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' })
  await expect
    .poll(
      () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)).catch(() => false),
      {
        timeout: 30_000,
      },
    )
    .toBe(true)

  // O usuário de teste entra pela primeira vez: conclua o tour antes de operar
  // um controle coberto pelo backdrop, sem forçar eventos nem ignorar a UI.
  await expect(page.getByRole('heading', { name: /Bem-vindo ao Meu Real!/ })).toBeVisible()
  await page.getByRole('button', { name: 'Próximo', exact: true }).click()
  await page.getByRole('button', { name: 'Pular tour' }).click()
  await expect(page.getByRole('button', { name: 'Pular tour' })).toBeHidden()

  const legacyVersion = await readWorkerVersion(page)
  expect(legacyVersion).toMatch(/^phase20-[a-f0-9]{12}$/)

  await context.setOffline(true)
  try {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('#root')).toBeVisible()
  } finally {
    await context.setOffline(false)
  }

  const changed = await request.post('http://127.0.0.1:4182/__pwa_test__/release?set=candidate')
  expect(changed.status()).toBe(204)

  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    await registration.update()
  })

  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration()
          return Boolean(registration?.waiting)
        }),
      { timeout: 30_000 },
    )
    .toBe(true)

  const candidateVersion = await readWorkerVersion(page, 'waiting')
  expect(candidateVersion).toMatch(/^phase20-[a-f0-9]{12}$/)
  expect(candidateVersion).not.toBe(legacyVersion)
  expect(await readWorkerVersion(page)).toBe(legacyVersion)

  await expect(page.getByRole('button', { name: 'Atualizar agora' })).toBeVisible()
  expect(await readWorkerVersion(page)).toBe(legacyVersion)

  await page.getByRole('button', { name: 'Atualizar agora' }).click()

  await expect
    .poll(() => readWorkerVersion(page).catch(() => null), { timeout: 30_000 })
    .toBe(candidateVersion)

  await expect(page.locator('#root')).toBeVisible()

  const cachesAfterUpdate = await page.evaluate(() => caches.keys())
  expect(cachesAfterUpdate.some((key) => key.includes(legacyVersion))).toBe(false)
  expect(cachesAfterUpdate.some((key) => key.includes(candidateVersion))).toBe(true)
})
