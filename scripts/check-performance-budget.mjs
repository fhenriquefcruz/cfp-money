import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const distRoot = 'dist'
const indexPath = join(distRoot, 'index.html')

const limits = {
  initialJavaScriptGzipBytes: 240 * 1024,
  totalJavaScriptGzipBytes: 700 * 1024,
  largestJavaScriptGzipBytes: 140 * 1024,
  initialCssGzipBytes: 20 * 1024,
}

if (!existsSync(indexPath)) {
  throw new Error('dist/index.html ausente. Execute npm run build antes da verificação.')
}

const indexHtml = readFileSync(indexPath, 'utf8')
const assets = []

function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    const stat = statSync(path)

    if (stat.isDirectory()) {
      walk(path)
      continue
    }

    const content = readFileSync(path)

    assets.push({
      file: relative(distRoot, path).replaceAll('\\', '/'),
      extension: extname(path).toLowerCase(),
      bytes: content.length,
      gzipBytes: gzipSync(content).length,
    })
  }
}

walk(distRoot)

const normalizeReference = (reference) =>
  reference
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/(?:cfp-money\/)?/, '')
    .replace(/^\.\//, '')
    .replace(/^\//, '')

const initialReferences = new Set(
  [...indexHtml.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map((match) =>
    normalizeReference(match[1]),
  ),
)

for (const asset of assets) {
  asset.initial = initialReferences.has(asset.file)
}

const sum = (items, field) => items.reduce((total, item) => total + item[field], 0)

const javascript = assets.filter((asset) => asset.extension === '.js')
const css = assets.filter((asset) => asset.extension === '.css')
const initialJavaScript = javascript.filter((asset) => asset.initial)
const initialCss = css.filter((asset) => asset.initial)
const largestJavaScript = [...javascript].sort(
  (first, second) => second.gzipBytes - first.gzipBytes,
)[0]

const metrics = {
  initialJavaScriptGzipBytes: sum(initialJavaScript, 'gzipBytes'),
  totalJavaScriptGzipBytes: sum(javascript, 'gzipBytes'),
  largestJavaScriptGzipBytes: largestJavaScript?.gzipBytes || 0,
  initialCssGzipBytes: sum(initialCss, 'gzipBytes'),
}

const failures = []

for (const [metric, limit] of Object.entries(limits)) {
  if (metrics[metric] > limit) {
    failures.push(`${metric}: ${metrics[metric]} bytes; limite: ${limit} bytes`)
  }
}

const initialFiles = [...initialReferences]

if (initialFiles.some((file) => /charts-/i.test(file))) {
  failures.push('O chunk de gráficos continua referenciado no HTML inicial.')
}

if (initialFiles.some((file) => /jspdf|autotable|html2canvas|purify/i.test(file))) {
  failures.push('Bibliotecas de exportação PDF entraram no carregamento inicial.')
}

const report = {
  generatedAt: new Date().toISOString(),
  limits,
  metrics,
  largestJavaScript,
  initialAssets: assets.filter((asset) => asset.initial),
  failures,
}

writeFileSync(join(distRoot, 'performance-budget.json'), `${JSON.stringify(report, null, 2)}\n`)

const kib = (bytes) => `${(bytes / 1024).toFixed(2)} KiB`

console.log('Orçamento de performance:')
console.table([
  {
    métrica: 'JavaScript inicial gzip',
    atual: kib(metrics.initialJavaScriptGzipBytes),
    limite: kib(limits.initialJavaScriptGzipBytes),
  },
  {
    métrica: 'JavaScript total gzip',
    atual: kib(metrics.totalJavaScriptGzipBytes),
    limite: kib(limits.totalJavaScriptGzipBytes),
  },
  {
    métrica: 'Maior JavaScript gzip',
    atual: kib(metrics.largestJavaScriptGzipBytes),
    limite: kib(limits.largestJavaScriptGzipBytes),
  },
  {
    métrica: 'CSS inicial gzip',
    atual: kib(metrics.initialCssGzipBytes),
    limite: kib(limits.initialCssGzipBytes),
  },
])

console.log('Assets iniciais:')
console.table(
  report.initialAssets.map((asset) => ({
    arquivo: asset.file,
    gzip: kib(asset.gzipBytes),
  })),
)

if (failures.length > 0) {
  console.error('Orçamento de performance excedido:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exitCode = 1
} else {
  console.log('Orçamento de performance validado com sucesso.')
}
