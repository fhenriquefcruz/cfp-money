import { test, expect } from '@playwright/test'

const PRIVATE_ROUTES = [
  './api/private-financial-data.json',
  './__/firebase/init.json',
  './functions/private-action',
  './firestore/users/alice',
]

const isTransientNavigationError = (error) =>
  /Execution context was destroyed|Cannot find context|Target page, context or browser has been closed|Not attached to an active page|Frame was detached|Navigation interrupted by another one/i.test(
    String(error),
  )

async function waitForStableControlledPage(page) {
  await expect
    .poll(
      async () => {
        try {
          const marker = await page.evaluate(() => {
            if (!navigator.serviceWorker.controller) return null

            const value = `${Date.now()}-${Math.random()}`
            window.__pwaStabilityMarker = value

            return {
              value,
              ready: document.readyState === 'complete',
            }
          })

          if (!marker?.ready) return false

          await page.waitForTimeout(500)

          return await page.evaluate(
            (expectedMarker) =>
              Boolean(
                navigator.serviceWorker.controller &&
                document.readyState === 'complete' &&
                window.__pwaStabilityMarker === expectedMarker,
              ),
            marker.value,
          )
        } catch (error) {
          if (isTransientNavigationError(error)) return false
          throw error
        }
      },
      {
        timeout: 25_000,
        intervals: [250, 500, 1_000],
        message: 'A página controlada pelo service worker deve permanecer estável entre navegações',
      },
    )
    .toBe(true)
}

async function waitForServiceWorkerControl(page) {
  await page.goto('./', { waitUntil: 'domcontentloaded' })

  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(async () => {
            const registration = await navigator.serviceWorker.getRegistration()

            return Boolean(registration?.active && navigator.serviceWorker.controller)
          })
        } catch (error) {
          if (isTransientNavigationError(error)) return false
          throw error
        }
      },
      {
        timeout: 25_000,
        intervals: [250, 500, 1_000],
        message: 'A página deve ficar controlada pelo service worker',
      },
    )
    .toBe(true)

  await waitForStableControlledPage(page)
}

async function reloadStable(page, options) {
  await expect
    .poll(
      async () => {
        try {
          await page.reload(options)
          return true
        } catch (error) {
          if (!isTransientNavigationError(error)) throw error

          await page.waitForLoadState('domcontentloaded').catch(() => {})
          return false
        }
      },
      {
        timeout: 30_000,
        intervals: [250, 500, 1_000],
        message: 'A recarga deve concluir após a navegação transitória do service worker',
      },
    )
    .toBe(true)

  await waitForStableControlledPage(page)
}

async function evaluateStable(page, callback, argument) {
  let result

  await expect
    .poll(
      async () => {
        try {
          result = await page.evaluate(callback, argument)
          return true
        } catch (error) {
          if (!isTransientNavigationError(error)) throw error

          await page.waitForLoadState('domcontentloaded').catch(() => {})
          return false
        }
      },
      {
        timeout: 20_000,
        intervals: [250, 500, 1_000],
        message: 'A avaliação deve ocorrer em um documento estável',
      },
    )
    .toBe(true)

  return result
}

async function readWorkerVersion(page) {
  let workerVersion = null

  await expect
    .poll(
      async () => {
        try {
          workerVersion = await page.evaluate(
            () =>
              new Promise((resolve) => {
                const controller = navigator.serviceWorker.controller

                if (!controller) {
                  resolve(null)
                  return
                }

                const channel = new MessageChannel()
                const timeout = window.setTimeout(() => resolve(null), 3_000)

                channel.port1.onmessage = (event) => {
                  window.clearTimeout(timeout)
                  resolve(event.data)
                }

                controller.postMessage({ type: 'GET_VERSION' }, [channel.port2])
              }),
          )

          return Boolean(
            workerVersion?.version && workerVersion?.shellCache && workerVersion?.assetCache,
          )
        } catch (error) {
          if (!isTransientNavigationError(error)) throw error

          workerVersion = null
          await page.waitForLoadState('domcontentloaded').catch(() => {})
          return false
        }
      },
      {
        timeout: 20_000,
        intervals: [250, 500, 1_000],
        message: 'O service worker deve responder com sua versão e caches',
      },
    )
    .toBe(true)

  return workerVersion
}

test('instala caches versionados sem armazenar endpoints de dados', async ({ page }) => {
  await waitForServiceWorkerControl(page)

  const version = await readWorkerVersion(page)
  expect(version.version).toMatch(/^phase20-[a-f0-9]{12}$/)

  const cacheState = await evaluateStable(page, async () => {
    const names = await caches.keys()
    const entries = {}

    for (const name of names) {
      const cache = await caches.open(name)
      entries[name] = (await cache.keys()).map((request) => request.url)
    }

    return { names, entries }
  })

  expect(cacheState.names).toContain(version.shellCache)
  expect(cacheState.names).toContain(version.assetCache)

  const assetUrls = cacheState.entries[version.assetCache]
  expect(assetUrls.length).toBeGreaterThan(5)
  expect(assetUrls.some((url) => /\/assets\/.+\.(js|css)$/.test(url))).toBe(true)

  const cachedUrls = Object.values(cacheState.entries).flat()
  expect(
    cachedUrls.some((url) =>
      /googleapis|firebaseio|firestore|firebaseapp|\/api\/|\/functions\//i.test(url),
    ),
  ).toBe(false)
})

test('mantém o aplicativo disponível durante navegação offline', async ({ page, context }) => {
  await waitForServiceWorkerControl(page)
  await reloadStable(page, { waitUntil: 'networkidle' })

  await context.setOffline(true)

  try {
    await reloadStable(page, { waitUntil: 'domcontentloaded' })

    await expect(page.locator('#root')).toBeVisible()
    await expect
      .poll(() => page.locator('#root').evaluate((root) => root.childElementCount))
      .toBeGreaterThan(0)
  } finally {
    await context.setOffline(false)
  }
})

test('não adiciona rotas privadas ou arbitrárias ao cache', async ({ page }) => {
  await waitForServiceWorkerControl(page)

  await evaluateStable(
    page,
    async (privateRoutes) => {
      await Promise.all(privateRoutes.map((route) => fetch(route).catch(() => {})))
      return true
    },
    PRIVATE_ROUTES,
  )

  const cached = await evaluateStable(
    page,
    async (privateRoutes) => {
      const matches = await Promise.all(privateRoutes.map((route) => caches.match(route)))
      return matches.some(Boolean)
    },
    PRIVATE_ROUTES,
  )

  expect(cached).toBe(false)
})

// Ensaio sintético: a query da URL força uma nova instalação com o mesmo código
// do SW atual. Não representa um build legado real já publicado.
test('mantém a versão atual até o usuário confirmar a atualização do service worker', async ({
  page,
}) => {
  await waitForServiceWorkerControl(page)

  const originalController = await evaluateStable(
    page,
    () => navigator.serviceWorker.controller?.scriptURL,
  )

  await evaluateStable(page, async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    const nextScript = new URL(registration.active.scriptURL)
    nextScript.searchParams.set('pwa-test-upgrade', 'candidate')
    await navigator.serviceWorker.register(nextScript.href, { scope: registration.scope })
    return true
  })

  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration()
          return Boolean(registration?.waiting)
        }),
      { timeout: 20_000 },
    )
    .toBe(true)

  await expect(page.getByRole('button', { name: 'Atualizar agora' })).toBeVisible()

  expect(await evaluateStable(page, () => navigator.serviceWorker.controller?.scriptURL)).toBe(
    originalController,
  )

  await page.getByRole('button', { name: 'Atualizar agora' }).click()

  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(() =>
            Boolean(navigator.serviceWorker.controller?.scriptURL.includes('pwa-test-upgrade')),
          )
        } catch (error) {
          if (isTransientNavigationError(error)) return false
          throw error
        }
      },
      { timeout: 25_000 },
    )
    .toBe(true)
})
