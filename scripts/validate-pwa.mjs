import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const fail = (message) => {
  console.error(`PWA inválida: ${message}`)
  process.exitCode = 1
}

const requiredFiles = [
  'public/manifest.json',
  'public/sw.js',
  'public/offline.html',
  'public/icon-192.png',
  'public/icon-512.png',
  'scripts/generate-service-worker.mjs',
]

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) fail(`arquivo ausente: ${file}`)
}

const manifestPath = join(root, 'public/manifest.json')
let manifest

try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
} catch {
  fail('manifest.json contém JSON inválido')
}

if (manifest) {
  for (const field of ['id', 'name', 'short_name', 'start_url', 'scope', 'display', 'icons']) {
    if (!manifest[field]) fail(`campo obrigatório ausente no manifesto: ${field}`)
  }

  if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) {
    fail('o manifesto precisa de ícones 192x192 e 512x512')
  }
}

const index = readFileSync(join(root, 'index.html'), 'utf8')
if (!index.includes('%BASE_URL%manifest.json')) fail('index.html não aponta para o manifesto')
if (!index.includes('apple-mobile-web-app-capable')) fail('metadados do iPhone ausentes')

const sourceWorker = readFileSync(join(root, 'public/sw.js'), 'utf8')

for (const requirement of [
  "const SW_VERSION = '__SW_VERSION__'",
  '/* __PRECACHE_MANIFEST__ */',
  'meu-real-shell-',
  'meu-real-assets-',
  'SKIP_WAITING',
  'GET_VERSION',
  'PRECACHE_URL_SET.has',
  'url.origin !== self.location.origin',
  "request.method !== 'GET'",
]) {
  if (!sourceWorker.includes(requirement)) {
    fail(`service worker não contém a política obrigatória: ${requirement}`)
  }
}

if (sourceWorker.includes('cache.put(request, copy)')) {
  fail('service worker ainda utiliza cache genérico da implementação anterior')
}

const generatedWorkerPath = join(root, 'dist/sw.js')
const metadataPath = join(root, 'dist/pwa-build.json')

if (existsSync(generatedWorkerPath)) {
  const generatedWorker = readFileSync(generatedWorkerPath, 'utf8')

  if (
    generatedWorker.includes('__SW_VERSION__') ||
    generatedWorker.includes('__PRECACHE_MANIFEST__')
  ) {
    fail('dist/sw.js contém marcadores não resolvidos')
  }

  if (!generatedWorker.includes("const SW_VERSION = 'phase20-")) {
    fail('dist/sw.js não possui versão baseada no build')
  }

  if (!generatedWorker.includes('/cfp-money/assets/')) {
    fail('dist/sw.js não possui precache dos assets versionados')
  }

  if (/googleapis|firebaseio|firestore\.google|firebaseapp\.com/i.test(generatedWorker)) {
    fail('dist/sw.js contém endpoint de dados remotos no precache')
  }
}

if (existsSync(metadataPath)) {
  try {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'))

    if (!metadata.version?.startsWith('phase20-')) {
      fail('pwa-build.json não contém uma versão válida')
    }

    if (!Array.isArray(metadata.precacheUrls) || metadata.precacheUrls.length === 0) {
      fail('pwa-build.json não contém assets para precache')
    }

    if (
      metadata.precacheUrls.some((url) => /googleapis|firebaseio|firestore|firebaseapp/i.test(url))
    ) {
      fail('pwa-build.json inclui endpoint remoto ou dado financeiro')
    }
  } catch {
    fail('pwa-build.json contém JSON inválido')
  }
}

if (!process.exitCode) console.log('PWA avançada validada com sucesso.')
