import { test, expect } from '@playwright/test'

const isTransientNavigationError = (error) =>
  /Execution context was destroyed|Cannot find context|Target page, context or browser has been closed/i.test(
    String(error),
  )

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

  await page.waitForLoadState('domcontentloaded')
}

async function readWorkerVersion(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const controller = navigator.serviceWorker.controller

        if (!controller) {
          reject(new Error('Página sem service worker controlador.'))
          return
        }

        const channel = new MessageChannel()
        const timeout = window.setTimeout(
          () => reject(new Error('O service worker não respondeu com a versão.')),
          5_000,
        )

        channel.port1.onmessage = (event) => {
          window.clearTimeout(timeout)
          resolve(event.data)
        }

        controller.postMessage({ type: 'GET_VERSION' }, [channel.port2])
      }),
  )
}

test('instala caches versionados sem armazenar endpoints de dados', async ({ page }) => {
  await waitForServiceWorkerControl(page)

  const version = await readWorkerVersion(page)
  expect(version.version).toMatch(/^phase20-[a-f0-9]{12}$/)

  const cacheState = await page.evaluate(async () => {
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
  await page.reload({ waitUntil: 'networkidle' })

  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })

  await expect(page.locator('#root')).toBeVisible()
  await expect
    .poll(() => page.locator('#root').evaluate((root) => root.childElementCount))
    .toBeGreaterThan(0)

  await context.setOffline(false)
})

test('não adiciona rotas privadas ou arbitrárias ao cache', async ({ page }) => {
  await waitForServiceWorkerControl(page)

  await page.evaluate(async () => {
    await fetch('/cfp-money/api/private-financial-data.json').catch(() => {})
  })

  const cached = await page.evaluate(async () =>
    Boolean(await caches.match('/cfp-money/api/private-financial-data.json')),
  )

  expect(cached).toBe(false)
})
