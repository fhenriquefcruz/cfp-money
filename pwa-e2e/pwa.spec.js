import { test, expect } from '@playwright/test'

const PRIVATE_ROUTE = './api/private-financial-data.json'

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
    async (privateRoute) => {
      await fetch(privateRoute).catch(() => {})
      return true
    },
    PRIVATE_ROUTE,
  )

  const cached = await evaluateStable(
    page,
    async (privateRoute) => Boolean(await caches.match(privateRoute)),
    PRIVATE_ROUTE,
  )

  expect(cached).toBe(false)
})
