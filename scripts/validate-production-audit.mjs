import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

const errors = []

const fail = (message) => {
  errors.push(message)
  console.error(`Auditoria: ${message}`)
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))

if (packageJson.dependencies?.['react-router-dom'] !== '7.18.2') {
  fail('react-router-dom deve permanecer fixado em 7.18.2.')
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

const productionAudit = runAudit(true)

const productionVulnerabilities = productionAudit.vulnerabilities ?? {}

for (const [packageName, entry] of Object.entries(productionVulnerabilities)) {
  fail(
    `${packageName}: vulnerabilidade de produção encontrada; severidade ${entry.severity}; faixa ${entry.range}.`,
  )
}

const fullAudit = runAudit(false)

const fullVulnerabilities = fullAudit.vulnerabilities ?? {}

for (const [packageName, entry] of Object.entries(fullVulnerabilities)) {
  if (entry.severity === 'high' || entry.severity === 'critical') {
    fail(`${packageName}: vulnerabilidade ${entry.severity} encontrada.`)
  }
}

if (errors.length > 0) {
  process.exit(1)
}

console.log('Auditoria: nenhuma vulnerabilidade de produção encontrada.')

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

console.log('Auditoria: nenhuma vulnerabilidade alta ou crítica encontrada.')
