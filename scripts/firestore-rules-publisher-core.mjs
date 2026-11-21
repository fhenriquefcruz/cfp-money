// Orquestração testável sem credenciais: o wrapper de produção injeta request.
import {
  FIRESTORE_RELEASE,
  assertProjectRuleset,
  getRulesetSource,
  normalizeRules,
  verifyApprovedOrigin,
  verifyPublishedTarget,
} from './firestore-rules-release-guard.mjs'

export async function readActiveRules(request) {
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

export async function publishVerifiedRules({ request, approved, expected }) {
  const previous = await readActiveRules(request)
  verifyApprovedOrigin(previous, approved)

  if (normalizeRules(previous.source) === normalizeRules(expected)) {
    return { rulesetName: previous.name, unchanged: true }
  }

  const created = await request('projects/cfp-money/rulesets', 'POST', {
    source: { files: [{ name: 'firestore.rules', content: expected }] },
  })
  const createdName = assertProjectRuleset(created.name)

  // Verificação repetida antes de atualizar a Release.
  verifyApprovedOrigin(await readActiveRules(request), approved)

  // PATCH de Release não tem condição atômica sobre o ruleset anterior.
  // Mudanças simultâneas externas exigem janela de mudança controlada.
  await request(FIRESTORE_RELEASE, 'PATCH', {
    release: { name: FIRESTORE_RELEASE, rulesetName: createdName },
    updateMask: 'rulesetName',
  })
  verifyPublishedTarget(await readActiveRules(request), expected, createdName)

  return { rulesetName: createdName, unchanged: false }
}
