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

if (!process.exitCode) console.log('PWA validada com sucesso.')
