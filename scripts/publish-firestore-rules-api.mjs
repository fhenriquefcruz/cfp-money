// Publica APENAS as regras do Firestore via Firebase Rules Management API.
// O Firebase CLI consulta Service Usage; nossa conta de serviço tem acesso
// de Rules, porém não à API Service Usage. Falha fechada em divergência.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { GoogleAuth } = require('google-auth-library')

const expected = readFileSync('firestore.rules', 'utf8')
const normalize = (value) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .trim()
const project = 'cfp-money'
const prefix = `https://firebaserules.googleapis.com/v1/projects/${project}`
const releaseName = `projects/${project}/releases/cloud.firestore`

const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
})
const token = await auth.getAccessToken()

async function request(path, method = 'GET', body) {
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) {
    // Evitar imprimir resposta potencialmente sensível.
    throw new Error(`Firebase Rules API ${method} falhou: HTTP ${response.status}`)
  }
  return response.json()
}

async function publishedRules() {
  const release = await request(`${prefix}/releases/cloud.firestore`)
  if (!/^projects\/cfp-money\/rulesets\//.test(release.rulesetName || '')) {
    throw new Error('Regras de produção não reconhecidas; operação abortada.')
  }
  const ruleset = await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`)
  const source =
    ruleset.source?.files?.find((file) => /firestore\.rules$/.test(file.name || ''))?.content ||
    ruleset.source?.files?.[0]?.content
  if (!source) throw new Error('Regras de produção não disponíveis.')
  return { name: release.rulesetName, source: normalize(source) }
}

// O preflight do workflow também compara as regras, mas o publicador valida
// novamente o estado aprovado para impedir substituição de mudanças externas
// ocorridas entre as duas etapas.
const approvedBaseline = normalize(
  readFileSync('scripts/firestore-rules-pre-attachments.rules', 'utf8'),
)
const previous = await publishedRules()
if (previous.source !== approvedBaseline && previous.source !== normalize(expected)) {
  throw new Error('Regras de produção divergiram do baseline aprovado; publicação bloqueada.')
}
if (previous.source === normalize(expected)) {
  console.log('Regras já estão publicadas; nenhuma alteração necessária.')
  process.exit(0)
}

// Regras atuais foram checadas pelo gate "before", mas não alterá-las se
// mudou algo enquanto o ruleset estava sendo criado.
const created = await request(`${prefix}/rulesets`, 'POST', {
  source: { files: [{ name: 'firestore.rules', content: expected }] },
})
if (!/^projects\/cfp-money\/rulesets\//.test(created.name || '')) {
  throw new Error('Ruleset criado fora do projeto esperado; operação abortada.')
}

const current = await publishedRules()
if (current.name !== previous.name || current.source !== previous.source) {
  throw new Error('Regras de produção mudaram durante a publicação; lançamento bloqueado.')
}

await request(`${prefix}/releases/cloud.firestore`, 'PATCH', {
  release: { name: releaseName, rulesetName: created.name },
  updateMask: 'rulesetName',
})
const published = await publishedRules()
if (published.source !== normalize(expected)) {
  throw new Error('Regras publicadas não correspondem ao arquivo revisado.')
}
console.log('Regras do Firestore publicadas e verificadas via API específica.')
