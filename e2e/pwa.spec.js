import { test, expect } from '@playwright/test'
import { prepareE2EPage } from './support'

test('manifesto e service worker permanecem disponíveis', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390', 'Contrato PWA executado uma vez.')

  await prepareE2EPage(page)

  const manifestResponse = await page.request.get('./manifest.json')
  expect(manifestResponse.ok()).toBe(true)
  const manifest = await manifestResponse.json()
  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toContain('/cfp-money/#/dashboard')
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2)

  const workerResponse = await page.request.get('./sw.js')
  expect(workerResponse.ok()).toBe(true)

  const workerSource = await workerResponse.text()

  expect(workerSource).toContain('const SW_VERSION =')
  expect(workerSource).toContain('const PRECACHE_URLS =')
  expect(workerSource).toContain('meu-real-shell-')
  expect(workerSource).toContain('meu-real-assets-')
})
