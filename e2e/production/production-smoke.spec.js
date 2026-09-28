import { expect, test } from '@playwright/test'

const baseURL = new URL(process.env.PRODUCTION_BASE_URL)

function publicAsset(path) {
  return new URL(path, baseURL).href
}

test('produção pública carrega login e PWA sem erro crítico', async ({ page, request }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const response = await page.goto('./', { waitUntil: 'domcontentloaded' })

  expect(response?.ok(), 'A página pública deve responder com sucesso.').toBe(true)
  await expect(page).toHaveTitle(/Meu Real/)
  await expect(page.getByRole('heading', { name: 'Continue com clareza.' })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()
  await expect(page.getByLabel('Senha')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar no Meu Real' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar com Google' })).toBeVisible()

  expect(pageErrors, `Erros JavaScript na página pública: ${pageErrors.join(' | ')}`).toEqual([])

  const manifestResponse = await request.get(publicAsset('manifest.json'))
  expect(manifestResponse.ok(), 'manifest.json deve estar acessível em produção.').toBe(true)

  const manifest = await manifestResponse.json()
  expect(manifest.name).toContain('Meu Real')
  expect(manifest.start_url).toContain('#/dashboard')
  expect(Array.isArray(manifest.icons)).toBe(true)
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2)

  const workerResponse = await request.get(publicAsset('sw.js'))
  expect(workerResponse.ok(), 'sw.js deve estar acessível em produção.').toBe(true)

  const worker = await workerResponse.text()
  expect(worker).toContain("const SW_VERSION = 'phase20-")
  expect(worker).not.toContain('__SW_VERSION__')
  expect(worker).not.toContain('__PRECACHE_MANIFEST__')

  const metadataResponse = await request.get(publicAsset('pwa-build.json'))
  expect(metadataResponse.ok(), 'pwa-build.json deve estar acessível em produção.').toBe(true)

  const metadata = await metadataResponse.json()
  expect(metadata.version).toMatch(/^phase20-/)
  expect(metadata.precacheCount).toBeGreaterThan(0)
  expect(Array.isArray(metadata.precacheUrls)).toBe(true)
  expect(metadata.precacheUrls.length).toBe(metadata.precacheCount)
})
