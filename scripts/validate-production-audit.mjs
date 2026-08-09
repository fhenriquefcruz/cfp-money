import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

const acceptedAdvisory = 'GHSA-QWWW-VCR4-C8H2'

const allowedVulnerablePackages = new Set(['react-router', 'react-router-dom'])

const errors = []

const fail = (message) => {
  errors.push(message)
  console.error(`Auditoria: ${message}`)
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))

if (packageJson.dependencies?.['react-router-dom'] !== '7.18.1') {
  fail('react-router-dom deve permanecer fixado em 7.18.1.')
}

if (packageJson.dependencies?.firebase !== '10.14.1') {
  fail('firebase deve permanecer fixado em 10.14.1.')
}

if (packageJson.overrides?.undici !== '6.28.0') {
  fail('undici deve permanecer sobrescrito para 6.28.0.')
}

const appSource = readFileSync('src/App.jsx', 'utf8')

if (!appSource.includes('HashRouter') || !appSource.includes('react-router-dom')) {
  fail('A aplicação deve permanecer em modo declarativo com HashRouter.')
}

const forbiddenMarkers = [
  'RouterProvider',
  'createBrowserRouter',
  'createHashRouter',
  'createMemoryRouter',
  'createStaticRouter',
  'createRequestHandler',
  'unstable_matchRSC',
  'unstable_RSC',
  'react-server-dom',
  '@react-router/dev',
  '@react-router/node',
  '@react-router/cloudflare',
]

const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'])

const sourceFiles = []

const walk = (directory) => {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    const stat = statSync(path)

    if (stat.isDirectory()) {
      walk(path)
      continue
    }

    if (sourceExtensions.has(extname(path))) {
      sourceFiles.push(path)
    }
  }
}

walk('src')

for (const path of sourceFiles) {
  const contents = readFileSync(path, 'utf8')

  for (const marker of forbiddenMarkers) {
    if (contents.includes(marker)) {
      fail(`API incompatível com a exceção RSC encontrada em ${path}: ${marker}`)
    }
  }
}

for (const dependencyName of Object.keys({
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
})) {
  if (
    dependencyName.startsWith('@react-router/') ||
    dependencyName.startsWith('react-server-dom-')
  ) {
    fail(`dependência incompatível com a exceção RSC: ${dependencyName}`)
  }
}

const runAudit = (omitDev) => {
  const argumentsList = ['audit', '--json']

  if (omitDev) {
    argumentsList.splice(1, 0, '--omit=dev')
  }

  try {
    return JSON.parse(
      execFileSync('npm', argumentsList, {
        encoding: 'utf8',
        maxBuffer: 30 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    )
  } catch (error) {
    const output = String(error.stdout ?? '').trim()

    if (!output) {
      throw error
    }

    return JSON.parse(output)
  }
}

const extractAdvisoryIds = (via) => {
  if (!via || typeof via !== 'object') {
    return []
  }

  const source = [via.url, via.title, via.name].filter(Boolean).join(' ')

  return [...source.matchAll(/GHSA-[0-9A-Z-]+/gi)].map((match) => match[0].toUpperCase())
}

const collectAdvisories = (vulnerabilities, packageName, seen = new Set()) => {
  if (seen.has(packageName)) {
    return new Set()
  }

  const nextSeen = new Set(seen)

  nextSeen.add(packageName)

  const entry = vulnerabilities[packageName]

  if (!entry || !Array.isArray(entry.via)) {
    return new Set()
  }

  const ids = new Set()

  for (const via of entry.via) {
    if (typeof via === 'string') {
      for (const id of collectAdvisories(vulnerabilities, via, nextSeen)) {
        ids.add(id)
      }

      continue
    }

    for (const id of extractAdvisoryIds(via)) {
      ids.add(id)
    }
  }

  return ids
}

const productionAudit = runAudit(true)

const productionVulnerabilities = productionAudit.vulnerabilities ?? {}

for (const [packageName, entry] of Object.entries(productionVulnerabilities)) {
  const ids = collectAdvisories(productionVulnerabilities, packageName)

  const accepted =
    allowedVulnerablePackages.has(packageName) && ids.size === 1 && ids.has(acceptedAdvisory)

  if (!accepted) {
    fail(
      `${packageName}: vulnerabilidade de produção não aceita; severidade ${entry.severity}; faixa ${entry.range}.`,
    )
  }
}

const fullAudit = runAudit(false)

const fullVulnerabilities = fullAudit.vulnerabilities ?? {}

for (const [packageName, entry] of Object.entries(fullVulnerabilities)) {
  if (entry.severity !== 'high' && entry.severity !== 'critical') {
    continue
  }

  const ids = collectAdvisories(fullVulnerabilities, packageName)

  const accepted =
    allowedVulnerablePackages.has(packageName) && ids.size === 1 && ids.has(acceptedAdvisory)

  if (!accepted) {
    fail(`${packageName}: vulnerabilidade ${entry.severity} fora da exceção documentada.`)
  }
}

if (errors.length > 0) {
  process.exit(1)
}

const productionNames = Object.keys(productionVulnerabilities)

if (productionNames.length === 0) {
  console.log('Auditoria: nenhuma vulnerabilidade de produção encontrada.')
} else {
  console.log(
    `Auditoria: produção contém somente ${acceptedAdvisory}, não aplicável ao modo declarativo sem RSC.`,
  )
}

const summary = fullAudit.metadata?.vulnerabilities ?? {}

console.log(
  [
    'Auditoria completa:',
    `low=${summary.low ?? 0},`,
    `moderate=${summary.moderate ?? 0},`,
    `high=${summary.high ?? 0},`,
    `critical=${summary.critical ?? 0}.`,
  ].join(' '),
)

console.log('Auditoria: nenhuma vulnerabilidade alta ou crítica fora da exceção documentada.')
