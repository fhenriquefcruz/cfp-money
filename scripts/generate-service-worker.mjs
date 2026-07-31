import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'

const root = process.cwd()
const distRoot = join(root, 'dist')
const sourcePath = join(root, 'public', 'sw.js')
const outputPath = join(distRoot, 'sw.js')
const metadataPath = join(distRoot, 'pwa-build.json')
const basePath = '/cfp-money/'

if (!existsSync(distRoot)) {
  throw new Error('Diretório dist ausente. Execute o build do Vite primeiro.')
}

const source = readFileSync(sourcePath, 'utf8')
const assetsRoot = join(distRoot, 'assets')
const assets = []

function walk(directory) {
  if (!existsSync(directory)) return

  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    const stat = statSync(path)

    if (stat.isDirectory()) {
      walk(path)
      continue
    }

    assets.push({
      file: relative(distRoot, path).replaceAll('\\', '/'),
      bytes: stat.size,
    })
  }
}

walk(assetsRoot)
assets.sort((first, second) => first.file.localeCompare(second.file))

if (assets.length === 0) {
  throw new Error('Nenhum asset versionado foi encontrado em dist/assets.')
}

const fingerprint = assets.map((asset) => `${asset.file}:${asset.bytes}`).join('\n')
const hash = createHash('sha256')
  .update(source)
  .update('\n')
  .update(fingerprint)
  .digest('hex')
  .slice(0, 12)

const version = `phase20-${hash}`
const precacheUrls = assets.map((asset) => `${basePath}${asset.file}`)

const versionMarker = "const SW_VERSION = '__SW_VERSION__'"
const manifestMarker = 'const PRECACHE_URLS = /* __PRECACHE_MANIFEST__ */ []'

if (!source.includes(versionMarker) || !source.includes(manifestMarker)) {
  throw new Error('Os marcadores de geração não foram encontrados em public/sw.js.')
}

const generated = source
  .replace(versionMarker, `const SW_VERSION = '${version}'`)
  .replace(manifestMarker, `const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)}`)

if (generated.includes('__SW_VERSION__') || generated.includes('__PRECACHE_MANIFEST__')) {
  throw new Error('O service worker gerado ainda contém marcadores não resolvidos.')
}

writeFileSync(outputPath, generated)
writeFileSync(
  metadataPath,
  `${JSON.stringify(
    {
      version,
      generatedAt: new Date().toISOString(),
      precacheCount: precacheUrls.length,
      precacheBytes: assets.reduce((total, asset) => total + asset.bytes, 0),
      precacheUrls,
    },
    null,
    2,
  )}\n`,
)

console.log(`Service worker ${version} gerado com ${precacheUrls.length} assets versionados.`)
