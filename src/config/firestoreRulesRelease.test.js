import { describe, expect, test } from 'vitest'
import workflow from '../../.github/workflows/deploy-firestore-rules.yml?raw'
import verifier from '../../scripts/verify-firestore-rules-release.mjs?raw'
import publisher from '../../scripts/publish-firestore-rules-api.mjs?raw'
import {
  getApprovedOrigin,
  getRulesetSource,
  normalizeRules,
  rulesSha256,
  verifyApprovedOrigin,
  verifyPublishedTarget,
} from '../../scripts/firestore-rules-release-guard.mjs'

const name = 'projects/cfp-money/rulesets/approved-uuid-123'
const source = "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{db}/documents {}\n}"
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
    expect(publisher).toContain('verifyApprovedOrigin(previous, approved)')
    expect(publisher).toContain('verifyApprovedOrigin(await publishedRules(), approved)')
    expect(publisher).toContain('verifyPublishedTarget(await publishedRules(), expected, createdName)')
    for (const script of [verifier, publisher]) {
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
    expect(() => verifyApprovedOrigin({ name, source: source + '\n// modificada' }, approval)).toThrow(
      /diverge/,
    )
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
    expect(getRulesetSource({ source: { files: [{ name: 'firestore.rules', content: source }] } })).toBe(
      source,
    )
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
