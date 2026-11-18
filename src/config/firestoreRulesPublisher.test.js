import { describe, expect, test, vi } from 'vitest'
import {
  FIRESTORE_RELEASE,
  rulesSha256,
} from '../../scripts/firestore-rules-release-guard.mjs'
import { publishVerifiedRules } from '../../scripts/firestore-rules-publisher-core.mjs'

const originalName = 'projects/cfp-money/rulesets/original-approved'
const newName = 'projects/cfp-money/rulesets/newly-created'
const originalSource = "rules_version = '2';\n// regras de origem sintéticas"
const desiredSource = "rules_version = '2';\n// regras de destino sintéticas"
const approval = { name: originalName, digest: rulesSha256(originalSource) }

function fakeRulesApi({
  source = originalSource,
  name = originalName,
  createdName = newName,
  driftAfterCreate = false,
  driftAfterPatch = false,
} = {}) {
  let live = { name, source }
  const request = vi.fn(async (path, method = 'GET', body) => {
    if (method === 'GET' && path === FIRESTORE_RELEASE) {
      return { name: FIRESTORE_RELEASE, rulesetName: live.name }
    }
    if (method === 'GET' && path === live.name) {
      return { name: live.name, source: { files: [{ name: 'firestore.rules', content: live.source }] } }
    }
    if (method === 'POST' && path === 'projects/cfp-money/rulesets') {
      if (driftAfterCreate) {
        live = { name: 'projects/cfp-money/rulesets/console-change', source: 'nova regra' }
      }
      return { name: createdName }
    }
    if (method === 'PATCH' && path === FIRESTORE_RELEASE) {
      live = {
        name: driftAfterPatch ? 'projects/cfp-money/rulesets/external' : body.release.rulesetName,
        source: body.release.rulesetName === createdName ? desiredSource : originalSource,
      }
      return { name: FIRESTORE_RELEASE, rulesetName: live.name }
    }
    throw new Error('Chamada inesperada ao Rules API sintético')
  })
  return { request, getLive: () => live }
}

function methods(request) {
  return request.mock.calls.map(([, method = 'GET']) => method)
}

describe('publicador exato de Firestore Rules — execução isolada sem API real', () => {
  test('troca somente após confirmar a origem e valida destino depois do PATCH', async () => {
    const api = fakeRulesApi()
    const result = await publishVerifiedRules({
      request: api.request,
      approved: approval,
      expected: desiredSource,
    })

    expect(result).toEqual({ rulesetName: newName, unchanged: false })
    expect(methods(api.request).filter((method) => method === 'POST')).toHaveLength(1)
    expect(methods(api.request).filter((method) => method === 'PATCH')).toHaveLength(1)
    expect(api.getLive()).toEqual({ name: newName, source: desiredSource })
  })

  test('origem já no destino não publica outra vez; preserva identidade auditada', async () => {
    const api = fakeRulesApi({ source: desiredSource })
    const result = await publishVerifiedRules({
      request: api.request,
      approved: { name: originalName, digest: rulesSha256(desiredSource) },
      expected: desiredSource,
    })

    expect(result).toEqual({ rulesetName: originalName, unchanged: true })
    expect(methods(api.request)).toEqual(['GET', 'GET'])
  })

  test('rejeita ID ativo diferente do aprovado antes de qualquer escrita', async () => {
    const api = fakeRulesApi({ name: 'projects/cfp-money/rulesets/not-approved' })
    await expect(
      publishVerifiedRules({ request: api.request, approved: approval, expected: desiredSource }),
    ).rejects.toThrow(/mudou/)
    expect(methods(api.request)).toEqual(['GET', 'GET'])
  })

  test('rejeita hash diferente mesmo se o ruleset ID permanecer igual', async () => {
    const api = fakeRulesApi({ source: originalSource + '\n// alteração externa' })
    await expect(
      publishVerifiedRules({ request: api.request, approved: approval, expected: desiredSource }),
    ).rejects.toThrow(/diverge/)
    expect(methods(api.request)).toEqual(['GET', 'GET'])
  })

  test('revalida contra drift externo após criar ruleset e antes do PATCH', async () => {
    const api = fakeRulesApi({ driftAfterCreate: true })
    await expect(
      publishVerifiedRules({ request: api.request, approved: approval, expected: desiredSource }),
    ).rejects.toThrow(/mudou/)
    expect(methods(api.request)).toContain('POST')
    expect(methods(api.request)).not.toContain('PATCH')
  })

  test('não publica regras criadas com ruleset fora do projeto aprovado', async () => {
    const api = fakeRulesApi({ createdName: 'projects/outro/rulesets/novo' })
    await expect(
      publishVerifiedRules({ request: api.request, approved: approval, expected: desiredSource }),
    ).rejects.toThrow(/fora do projeto/)
    expect(methods(api.request)).not.toContain('PATCH')
  })

  test('detecta publicação concorrente ou destino diferente após o PATCH', async () => {
    const api = fakeRulesApi({ driftAfterPatch: true })
    await expect(
      publishVerifiedRules({ request: api.request, approved: approval, expected: desiredSource }),
    ).rejects.toThrow(/não corresponde/)
    expect(methods(api.request)).toContain('PATCH')
  })
})
