import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const errors = []

const fail = (message) => {
  errors.push(message)
  console.error(`Segurança: ${message}`)
}

const readText = (path) => readFileSync(path, 'utf8')

const environmentLines = readText('.env.example').split(/\r?\n/).filter(Boolean)

const secureDefaults = {
  VITE_APP_CHECK_ENABLED: 'false',
  VITE_REQUIRE_APP_CHECK: 'false',
  VITE_APP_CHECK_DEBUG: 'false',
}

for (const [key, expectedValue] of Object.entries(secureDefaults)) {
  const matches = environmentLines.filter((line) => line.startsWith(`${key}=`))

  if (matches.length !== 1) {
    fail(`${key} deve aparecer exatamente uma vez em .env.example.`)
    continue
  }

  const currentValue = matches[0].slice(key.length + 1)

  if (currentValue !== expectedValue) {
    fail(`${key} deve usar o valor seguro padrão ${expectedValue}.`)
  }
}

const firebaseSource = readText('src/services/firebase.js')

const firebaseControls = [
  "import { securityRuntime } from '../config/securityRuntime'",
  'securityRuntime.appCheckEnabled',
  'securityRuntime.appCheckDebug',
  'securityRuntime.appCheckSiteKey',
  'FIREBASE_APPCHECK_DEBUG_TOKEN',
]

for (const control of firebaseControls) {
  if (!firebaseSource.includes(control)) {
    fail(`Controle ausente em src/services/firebase.js: ${control}`)
  }
}

const functionsSource = readText('functions/index.js')

if (!functionsSource.includes('ENFORCE_APP_CHECK')) {
  fail('ENFORCE_APP_CHECK não foi encontrado em functions/index.js.')
}

const rulesSource = readText('firestore.rules')

const rulesControls = [
  "rules_version = '2';",
  "'admin' in request.auth.token",
  'validInitialUser',
  'validOwnerUserUpdate',
  '.diff(resource.data)',
  '.affectedKeys()',
  '.hasOnly([',
  'allow read, write: if false;',
]

for (const control of rulesControls) {
  if (!rulesSource.includes(control)) {
    fail(`Controle ausente em firestore.rules: ${control}`)
  }
}

const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean)

const ignoredFiles = new Set(['scripts/validate-security-config.mjs'])

const secretPatterns = [
  {
    name: 'credencial de conta de serviço Google',
    regex: /"type"\s*:\s*"service_account"/,
  },
  {
    name: 'token clássico do GitHub',
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/,
  },
  {
    name: 'token fine-grained do GitHub',
    regex: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  },
  {
    name: 'Google OAuth client secret',
    regex: /\bGOCSPX-[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: 'AWS access key',
    regex: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: 'token Slack',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  },
  {
    name: 'chave Stripe de produção',
    regex: /\bsk_live_[A-Za-z0-9]{20,}\b/,
  },
]

const privateKeyBlockPattern =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----([\s\S]*?)-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g

const placeholderWords = ['SUBSTITUA', 'PLACEHOLDER', 'EXAMPLE', 'YOUR_PRIVATE_KEY']

let scannedFiles = 0

for (const path of files) {
  if (ignoredFiles.has(path)) continue

  let contents

  try {
    contents = readFileSync(path)
  } catch {
    continue
  }

  if (contents.includes(0)) continue
  if (contents.length > 5 * 1024 * 1024) continue

  scannedFiles += 1

  const text = contents.toString('utf8')

  privateKeyBlockPattern.lastIndex = 0

  for (const match of text.matchAll(privateKeyBlockPattern)) {
    const payload = String(match[1] ?? '')
      .replace(/\\n/g, '\n')
      .replace(/\s/g, '')

    const normalizedPayload = payload.toUpperCase()

    const isPlaceholder = placeholderWords.some((word) => normalizedPayload.includes(word))

    if (!isPlaceholder && payload.length >= 64) {
      fail(`chave privada incorporada encontrada em: ${path}`)
    }
  }

  for (const pattern of secretPatterns) {
    pattern.regex.lastIndex = 0

    if (pattern.regex.test(text)) {
      fail(`${pattern.name} encontrada em: ${path}`)
    }
  }
}

if (errors.length > 0) {
  console.error(`Segurança: ${errors.length} problema(s) encontrado(s).`)
  process.exit(1)
}

console.log(`Segurança: configuração aprovada e ${scannedFiles} arquivo(s) examinados.`)
