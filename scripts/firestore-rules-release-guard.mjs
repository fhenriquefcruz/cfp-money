import { createHash } from 'node:crypto'

const RULESET_PREFIX = 'projects/cfp-money/rulesets/'
const RULESET_ID = /^projects\/cfp-money\/rulesets\/[A-Za-z0-9_-]+$/
export const FIRESTORE_RELEASE = 'projects/cfp-money/releases/cloud.firestore'

export const normalizeRules = (source) =>
  String(source || '')
    .replace(/\r\n/g, '\n')
    .trim()

export function rulesSha256(source) {
  return createHash('sha256').update(normalizeRules(source)).digest('hex')
}

export function validRulesetName(name) {
  return typeof name === 'string' && RULESET_ID.test(name)
}

export function getRulesetSource(ruleset) {
  const files = ruleset?.source?.files
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('Ruleset sem arquivos de origem verificáveis.')
  }

  const firestoreFiles = files.filter((file) => /(^|\/)firestore\.rules$/.test(file.name || ''))
  if (firestoreFiles.length > 1 || (firestoreFiles.length === 0 && files.length !== 1)) {
    throw new Error('Ruleset com origem ambígua; publicação bloqueada.')
  }
  const source = (firestoreFiles[0] || files[0]).content
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('Ruleset sem conteúdo de regras verificável.')
  }
  return source
}

export function getApprovedOrigin(env = process.env) {
  const name = env.APPROVED_ACTIVE_RULESET
  const digest = env.APPROVED_ACTIVE_RULES_SHA256
  if (!validRulesetName(name)) {
    throw new Error('Identificador completo do ruleset ativo aprovado é obrigatório.')
  }
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)) {
    throw new Error('SHA-256 das regras ativas aprovadas é obrigatório.')
  }
  return { name, digest }
}

export function verifyApprovedOrigin(active, approved) {
  if (active?.name !== approved.name) {
    throw new Error('Ruleset ativo mudou desde a aprovação; publicação bloqueada.')
  }
  if (rulesSha256(active?.source) !== approved.digest) {
    throw new Error('Conteúdo das regras ativas diverge da aprovação; publicação bloqueada.')
  }
}

export function verifyPublishedTarget(active, expectedSource, expectedRuleset) {
  if (!validRulesetName(expectedRuleset) || active?.name !== expectedRuleset) {
    throw new Error('Ruleset publicado não corresponde ao identificador esperado.')
  }
  if (normalizeRules(active?.source) !== normalizeRules(expectedSource)) {
    throw new Error('Regras publicadas divergem do conteúdo versionado.')
  }
}

export function assertProjectRuleset(name) {
  if (!validRulesetName(name) || !name.startsWith(RULESET_PREFIX)) {
    throw new Error('Ruleset fora do projeto Firebase aprovado.')
  }
  return name
}
