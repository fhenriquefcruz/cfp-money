import { describe, expect, test } from 'vitest'
import workflow from '../../.github/workflows/deploy-firestore-rules.yml?raw'
import verifier from '../../scripts/verify-firestore-rules-release.mjs?raw'
import publisher from '../../scripts/publish-firestore-rules-api.mjs?raw'
import publisherCore from '../../scripts/firestore-rules-publisher-core.mjs?raw'
import {
  getApprovedOrigin,
  getRulesetSource,
  normalizeRules,
  rulesSha256,
  verifyApprovedOrigin,
  verifyPublishedTarget,
} from '../../scripts/firestore-rules-release-guard.mjs'

const name = 'projects/cfp-money/rulesets/approved-uuid-123'
const source = [
  "rules_version = '2';",
  'service cloud.firestore {',
  '  match /databases/{db}/documents {}',
  '}',
].join('\n')
const approval = { name, digest: rulesSha256(source) }

describe('publicação segura das regras Firestore', () => {
  test('nunca publica automaticamente no push ou em PR', () => {
    expect(workflow).toMatch(/^ {2}workflow_dispatch:/m)
    expect(workflow).not.toMatch(/^ {2}push:/m)
    expect(workflow).toContain('cancel-in-progress: false')
    expect(workflow).toContain('group: firestore-rules-manual-release')
  })

  test('requer SHA aprovado, ruleset exato, digest do conteúdo e confirmação', () => {
    for (const field of [
      'approved_sha:',
      'approved_ruleset:',
      'approved_rules_sha256:',
      'confirmation:',
      'PUBLICAR_REGRAS_FIRESTORE',
      'refs/heads/main',
      'git rev-parse HEAD',
    ]) {
      expect(workflow).toContain(field)
    }
    expect(workflow.indexOf('Verify manually approved release source')).toBeLessThan(
      workflow.indexOf('Deploy ONLY Firestore rules'),
    )
    expect(workflow.indexOf('Block deployment if Console rules diverged')).toBeLessThan(
      workflow.indexOf('Deploy ONLY Firestore rules'),
    )
    expect(workflow.indexOf('Deploy ONLY Firestore rules')).toBeLessThan(
      workflow.indexOf('Verify deployed rules match source'),
    )
  })

  test('verificador e publicador compartilham baseline explícito, não histórico implícito', () => {
    expect(verifier).toContain('verifyApprovedOrigin(active, approved)')
    expect(publisher).toContain('publishVerifiedRules({ request, approved, expected })')
    expect(publisherCore).toContain('verifyApprovedOrigin(previous, approved)')
    const repeatedCheck = 'verifyApprovedOrigin(await readActiveRules(request), approved)'
    const finalCheck = 'verifyPublishedTarget(await readActiveRules(request), expected, createdName)'
    expect(publisherCore).toContain(repeatedCheck)
    expect(publisherCore).toContain(finalCheck)
    for (const script of [verifier, publisher, publisherCore]) {
      expect(script).not.toContain('HEAD^:firestore.rules')
      expect(script).not.toContain('firestore-rules-pre-attachments.rules')
    }
  })

  test('não aceita aprovação sem identidade e fingerprint completos', () => {
    expect(() => getApprovedOrigin({})).toThrow()
    expect(() =>
      getApprovedOrigin({
        APPROVED_ACTIVE_RULESET: 'projects/outro/rulesets/uuid123',
        APPROVED_ACTIVE_RULES_SHA256: approval.digest,
      }),
    ).toThrow()
    expect(() =>
      getApprovedOrigin({
        APPROVED_ACTIVE_RULESET: name,
        APPROVED_ACTIVE_RULES_SHA256: 'incorrect',
      }),
    ).toThrow()
    expect(
      getApprovedOrigin({
        APPROVED_ACTIVE_RULESET: name,
        APPROVED_ACTIVE_RULES_SHA256: approval.digest,
      }),
    ).toEqual(approval)
  })

  test('bloqueia outra versão e mesma origem com ruleset ID diferente', () => {
    expect(() => verifyApprovedOrigin({ name, source }, approval)).not.toThrow()
    expect(() =>
      verifyApprovedOrigin({ name: 'projects/cfp-money/rulesets/other', source }, approval),
    ).toThrow(/mudou/)
    const modified = { name, source: source + '\n// modificada' }
    expect(() => verifyApprovedOrigin(modified, approval)).toThrow(/diverge/)
  })

  test('pós-publicação exige ruleset publicado e conteúdo exatos', () => {
    expect(() => verifyPublishedTarget({ name, source }, source, name)).not.toThrow()
    expect(() =>
      verifyPublishedTarget({ name: 'projects/cfp-money/rulesets/other', source }, source, name),
    ).toThrow()
    expect(() => verifyPublishedTarget({ name, source: source + 'x' }, source, name)).toThrow()
  })

  test('normaliza CRLF apenas e recusa origem de arquivo ambígua', () => {
    expect(normalizeRules(source.replaceAll('\n', '\r\n'))).toBe(normalizeRules(source))
    expect(rulesSha256(source.replaceAll('\n', '\r\n'))).toBe(rulesSha256(source))
    const singleFile = { source: { files: [{ name: 'firestore.rules', content: source }] } }
    expect(getRulesetSource(singleFile)).toBe(source)
    expect(() => getRulesetSource({ source: { files: [] } })).toThrow()
    expect(() =>
      getRulesetSource({
        source: {
          files: [
            { name: 'a.rules', content: source },
            { name: 'b.rules', content: source },
          ],
        },
      }),
    ).toThrow(/ambígua/)
  })
})
