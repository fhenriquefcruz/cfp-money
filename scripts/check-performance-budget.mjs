import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const distRoot = 'dist'

const indexPath = join(distRoot, 'index.html')

// Budget v2: recalibrado após a correção de segurança do DOMPurify e a
// introdução da semântica financeira auditável da Phase 42A. Na Phase 42D,
// o teto total ganhou 1 KiB de margem para absorver a auditoria de orçamentos.
// A Phase 41B acrescenta mais 1 KiB global para a personalização transparente,
// compensado por um teto dedicado da rota Money. Na Phase 45, o teto total ganha
// 4 KiB para a semântica auditável de Poupança/Reservas distribuída nas rotas
// lazy; o carregamento inicial e o maior chunk permanecem inalterados. Na
// Phase 46, a Central de Reservas adiciona um chunk lazy de 3,39 KiB gzip;
// o teto total recebe 5 KiB de margem dedicada, sem ampliar o bootstrap.
const limits = {
  initialJavaScriptGzipBytes: 242 * 1024,
  totalJavaScriptGzipBytes: 718 * 1024,
  moneyRouteGzipBytes: 18 * 1024,
  largestJavaScriptGzipBytes: 140 * 1024,
  initialCssGzipBytes: 20 * 1024 + 256,
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
const moneyRoute = javascript.find((asset) => /^assets\/Money-.*\.js$/i.test(asset.file))

const metrics = {
  initialJavaScriptGzipBytes: sum(initialJavaScript, 'gzipBytes'),
  totalJavaScriptGzipBytes: sum(javascript, 'gzipBytes'),
  moneyRouteGzipBytes: moneyRoute?.gzipBytes || 0,
  largestJavaScriptGzipBytes: largestJavaScript?.gzipBytes || 0,
  initialCssGzipBytes: sum(initialCss, 'gzipBytes'),
}

const failures = []

if (!moneyRoute) {
  failures.push('O chunk dedicado do Money não foi encontrado no build.')
}

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
    métrica: 'Rota Money gzip',
    atual: kib(metrics.moneyRouteGzipBytes),
    limite: kib(limits.moneyRouteGzipBytes),
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
