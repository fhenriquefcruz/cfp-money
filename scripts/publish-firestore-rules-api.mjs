// Publicação somente no workflow manual: origem exata, SHA revisado e
// verificação da Release antes e depois da troca de ruleset.
import { appendFileSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import {
  FIRESTORE_RELEASE,
  assertProjectRuleset,
  getApprovedOrigin,
  getRulesetSource,
  normalizeRules,
  verifyApprovedOrigin,
  verifyPublishedTarget,
} from './firestore-rules-release-guard.mjs'

const require = createRequire(import.meta.url)
const { GoogleAuth } = require('google-auth-library')
const expected = readFileSync('firestore.rules', 'utf8')
const approved = getApprovedOrigin()

if (
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.GITHUB_REF !== 'refs/heads/main' ||
  process.env.GITHUB_SHA !== process.env.APPROVED_RELEASE_SHA ||
  !/^[a-f0-9]{40}$/.test(process.env.APPROVED_RELEASE_SHA || '') ||
  process.env.RELEASE_CONFIRMATION !== 'PUBLICAR_REGRAS_FIRESTORE' ||
  !process.env.GITHUB_ENV
) {
  throw new Error('Publicação requer workflow manual na main e SHA expressamente aprovado.')
}

const prefix = 'https://firebaserules.googleapis.com/v1'
const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
})
const token = await auth.getAccessToken()

async function request(path, method = 'GET', body) {
  const response = await fetch(`${prefix}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) {
    // Não imprimir payload de erro remoto: pode conter informações sensíveis.
    throw new Error(`Rules API ${method} falhou: HTTP ${response.status}`)
  }
  return response.json()
}

async function publishedRules() {
  const release = await request(FIRESTORE_RELEASE)
  if (release.name !== FIRESTORE_RELEASE) {
    throw new Error('A API retornou Release diferente da aprovada.')
  }
  const name = assertProjectRuleset(release.rulesetName)
  const ruleset = await request(name)
  if (ruleset.name !== name) {
    throw new Error('A API retornou Ruleset diferente do solicitado.')
  }
  return { name, source: getRulesetSource(ruleset) }
}

function exportPublishedRuleset(name) {
  appendFileSync(process.env.GITHUB_ENV, `PUBLISHED_RULESET=${assertProjectRuleset(name)}\n`)
}

const previous = await publishedRules()
verifyApprovedOrigin(previous, approved)

if (normalizeRules(previous.source) === normalizeRules(expected)) {
  exportPublishedRuleset(previous.name)
  console.log('Rules já publicadas com origem aprovada; nenhum PATCH foi realizado.')
  process.exit(0)
}

const created = await request('projects/cfp-money/rulesets', 'POST', {
  source: { files: [{ name: 'firestore.rules', content: expected }] },
})
const createdName = assertProjectRuleset(created.name)

// Revalidação da origem, sem aceitar snapshots históricos por aproximação.
verifyApprovedOrigin(await publishedRules(), approved)

// ATENÇÃO: a API PATCH não oferece compare-and-swap do ruleset de origem.
// Há risco residual de mudanças externas simultâneas entre GET e PATCH.
// Exigir janela controlada e titular responsável na aprovação operacional.
await request(FIRESTORE_RELEASE, 'PATCH', {
  release: { name: FIRESTORE_RELEASE, rulesetName: createdName },
  updateMask: 'rulesetName',
})

verifyPublishedTarget(await publishedRules(), expected, createdName)
exportPublishedRuleset(createdName)
console.log('Rules publicadas: ruleset ativo e conteúdo exato foram verificados.')
