// Entrada exclusiva do workflow manual. Nenhuma escrita com origem ambígua.
import { appendFileSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { getApprovedOrigin } from './firestore-rules-release-guard.mjs'
import { publishVerifiedRules } from './firestore-rules-publisher-core.mjs'

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
    // Não imprimir texto de erro remoto potencialmente sensível.
    throw new Error(`Rules API ${method} falhou: HTTP ${response.status}`)
  }
  return response.json()
}

const result = await publishVerifiedRules({ request, approved, expected })
appendFileSync(process.env.GITHUB_ENV, `PUBLISHED_RULESET=${result.rulesetName}\n`)
console.log(
  result.unchanged
    ? 'Rules já publicadas com origem aprovada; nenhum PATCH foi realizado.'
    : 'Rules publicadas: ID e conteúdo da Release foram verificados.',
)
