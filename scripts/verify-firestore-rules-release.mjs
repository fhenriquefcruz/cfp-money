// Auditoria de Rules somente por leitura. Antes da publicação exige origem
// exata aprovada, não HEAD^ ou snapshots legados desconectados do ambiente.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import {
  FIRESTORE_RELEASE,
  assertProjectRuleset,
  getApprovedOrigin,
  getRulesetSource,
  rulesSha256,
  verifyApprovedOrigin,
  verifyPublishedTarget,
} from './firestore-rules-release-guard.mjs'

const require = createRequire(import.meta.url)
const { GoogleAuth } = require('google-auth-library')
const mode = process.argv[2]
if (!['inspect', 'before', 'after'].includes(mode)) {
  throw new Error('Modo inválido: use inspect, before ou after.')
}

// Falha antes de autenticar ou chamar a API se a aprovação não existe.
const approved = mode === 'inspect' ? null : getApprovedOrigin()
const targetRuleset =
  mode === 'after' ? assertProjectRuleset(process.env.PUBLISHED_RULESET) : null
const intended = mode === 'inspect' ? '' : readFileSync('firestore.rules', 'utf8')

const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
})
const token = await auth.getAccessToken()

async function getRules(path) {
  const response = await fetch(`https://firebaserules.googleapis.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`Rules API GET falhou: HTTP ${response.status}`)
  return response.json()
}

const release = await getRules(FIRESTORE_RELEASE)
if (release.name !== FIRESTORE_RELEASE) {
  throw new Error('Release Firebase inesperada; operação interrompida.')
}
const activeRuleset = assertProjectRuleset(release.rulesetName)
const result = await getRules(activeRuleset)
if (result.name !== activeRuleset) {
  throw new Error('A API retornou um ruleset diferente do solicitado.')
}
const active = { name: activeRuleset, source: getRulesetSource(result) }

if (mode === 'inspect') {
  // Apenas identidade e fingerprint: não publicar texto de regras ou dados privados.
  console.log(`Ruleset ativo: ${active.name}`)
  console.log(`SHA-256 da origem: ${rulesSha256(active.source)}`)
} else if (mode === 'before') {
  verifyApprovedOrigin(active, approved)
  console.log('Preflight aprovado: ID e conteúdo do ruleset ativo conferem com a aprovação.')
} else {
  verifyPublishedTarget(active, intended, targetRuleset)
  console.log('Pós-publicação conferida: ID e conteúdo coincidem com o destino versionado.')
}
