import { describe, expect, test } from 'vitest'
import workflow from '../../.github/workflows/phase-21-security.yml?raw'

const [audit, rules] = workflow.split('  firestore-policy:')
const auditJob = audit.split('  dependency-audit:')[1]

describe('Phase 21 security isolation', () => {
  test('keeps high/critical dependency auditing as a blocking independent job', () => {
    expect(auditJob).toContain('npm run validate:security-config')
    expect(auditJob).toContain('npm run validate:production-audit')
    expect(auditJob).toContain('npm audit --audit-level=critical')
    expect(auditJob).toContain('npm audit --prefix functions --omit=dev --audit-level=high')
    expect(auditJob).toContain('npm audit --prefix worker/email-notifications --audit-level=high')
    expect(workflow).not.toContain('continue-on-error:')
  })

  test('runs App Check and UID Rules in parallel even if dependency audit fails', () => {
    expect(workflow).toMatch(/^ {2}dependency-audit:/m)
    expect(workflow).toMatch(/^ {2}firestore-policy:/m)
    expect(workflow).not.toMatch(/^ {4}needs:/m)
    expect(rules).toContain('npm run test:security-runtime')
    expect(rules).toContain('npm run test:rules')
    expect(rules).toContain('npm ci')
  })
})
