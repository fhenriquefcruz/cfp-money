import { describe, expect, test } from 'vitest'
import workflow from '../../.github/workflows/deploy-firestore-rules.yml?raw'

describe('publicação segura das regras Firestore', () => {
  test('nunca publica regras automaticamente no push de main', () => {
    expect(workflow).toMatch(/^ {2}workflow_dispatch:/m)
    expect(workflow).not.toMatch(/^ {2}push:/m)
  })

  test('exige autorização explícita, ref main e commit SHA completo', () => {
    expect(workflow).toContain('approved_sha:')
    expect(workflow).toContain('confirmation:')
    expect(workflow).toContain('PUBLICAR_REGRAS_FIRESTORE')
    expect(workflow).toContain('refs/heads/main')
    expect(workflow).toContain('git rev-parse HEAD')
    expect(workflow.indexOf('Verify manually approved release source')).toBeLessThan(
      workflow.indexOf('Deploy ONLY Firestore rules'),
    )
  })
})
