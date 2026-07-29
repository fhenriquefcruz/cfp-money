const test = require('node:test')
const assert = require('node:assert/strict')
const {
  DELETION_CONFIRMATION,
  LEGAL_VERSIONS,
  buildDeletionSchedule,
  buildPortableExport,
  buildPrivacyStatus,
  serializeFirestoreValue,
  validateDeletionConfirmation,
  validateLegalAcceptance,
} = require('../lib/privacyDomain')

test('serializa datas e objetos aninhados', () => {
  const serialized = serializeFirestoreValue({
    createdAt: {
      toDate: () => new Date('2026-07-27T12:00:00.000Z'),
    },
    list: [new Date('2026-07-28T12:00:00.000Z')],
  })

  assert.equal(serialized.createdAt, '2026-07-27T12:00:00.000Z')
  assert.equal(serialized.list[0], '2026-07-28T12:00:00.000Z')
})

test('exige frase exata para exclusão', () => {
  assert.equal(validateDeletionConfirmation(DELETION_CONFIRMATION), true)

  assert.throws(() => validateDeletionConfirmation('excluir'), /Digite exatamente/)
})

test('agenda exclusão para sete dias', () => {
  const scheduled = buildDeletionSchedule(new Date('2026-07-27T00:00:00.000Z'))

  assert.equal(scheduled.toISOString(), '2026-08-03T00:00:00.000Z')
})

test('exige versões jurídicas atuais', () => {
  assert.deepEqual(
    validateLegalAcceptance({
      accepted: true,
      termsVersion: LEGAL_VERSIONS.terms,
      privacyVersion: LEGAL_VERSIONS.privacy,
    }),
    {
      termsVersion: LEGAL_VERSIONS.terms,
      privacyVersion: LEGAL_VERSIONS.privacy,
    },
  )

  assert.throws(
    () =>
      validateLegalAcceptance({
        accepted: true,
        termsVersion: '0.9.0',
        privacyVersion: LEGAL_VERSIONS.privacy,
      }),
    /versão atual/,
  )
})

test('identifica consentimento pendente', () => {
  const status = buildPrivacyStatus({
    acceptedTermsVersion: LEGAL_VERSIONS.terms,
    acceptedPrivacyVersion: '0.9.0',
  })

  assert.equal(status.requiresAcceptance, true)
})

test('monta exportação portátil sem segredos', () => {
  const exported = buildPortableExport({
    uid: 'user-1',
    user: { displayName: 'Fábio' },
    auth: { email: 'fabio@example.com' },
    collections: {
      transactions: [{ amount: 100 }],
    },
    ownedCategories: [],
    integration: {
      provider: 'telegram',
      linked: true,
    },
    relatedData: {
      privacyConsents: [{ termsVersion: '1.0.0' }],
    },
    generatedAt: new Date('2026-07-27T12:00:00.000Z'),
  })

  assert.equal(exported.schemaVersion, '1.0.0')
  assert.equal(exported.subject.uid, 'user-1')
  assert.equal(exported.data.transactions[0].amount, 100)
  assert.equal(exported.integration.linked, true)
  assert.equal(exported.relatedData.privacyConsents[0].termsVersion, '1.0.0')
})
