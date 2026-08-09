const LEGAL_VERSIONS = {
  terms: '1.0.0',
  privacy: '1.0.0',
}

const DELETION_CONFIRMATION = 'EXCLUIR MINHA CONTA'
const DELETION_GRACE_DAYS = 7
const DAY_IN_MS = 86_400_000

function toIso(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }
  if (value instanceof Date) return value.toISOString()

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function serializeFirestoreValue(value) {
  if (value === null || value === undefined) return value

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue)
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeFirestoreValue(item)]),
    )
  }

  return value
}

function buildDeletionSchedule(now = new Date()) {
  return new Date(now.getTime() + DELETION_GRACE_DAYS * DAY_IN_MS)
}

function validateDeletionConfirmation(value) {
  if (
    String(value || '')
      .trim()
      .toUpperCase() !== DELETION_CONFIRMATION
  ) {
    throw new Error(`Digite exatamente "${DELETION_CONFIRMATION}".`)
  }

  return true
}

function validateLegalAcceptance(data = {}) {
  if (data.accepted !== true) {
    throw new Error('É necessário aceitar os Termos e a Política de Privacidade.')
  }

  if (
    data.termsVersion !== LEGAL_VERSIONS.terms ||
    data.privacyVersion !== LEGAL_VERSIONS.privacy
  ) {
    throw new Error('A versão jurídica informada não é a versão atual.')
  }

  return {
    termsVersion: LEGAL_VERSIONS.terms,
    privacyVersion: LEGAL_VERSIONS.privacy,
  }
}

function buildPrivacyStatus(userData = {}, deletionData = null) {
  const acceptedTerms = userData.acceptedTermsVersion === LEGAL_VERSIONS.terms
  const acceptedPrivacy = userData.acceptedPrivacyVersion === LEGAL_VERSIONS.privacy

  return {
    termsVersion: LEGAL_VERSIONS.terms,
    privacyVersion: LEGAL_VERSIONS.privacy,
    acceptedTermsVersion: userData.acceptedTermsVersion || null,
    acceptedPrivacyVersion: userData.acceptedPrivacyVersion || null,
    acceptedAt: toIso(userData.legalAcceptedAt),
    requiresAcceptance: !acceptedTerms || !acceptedPrivacy,
    deletionRequest: deletionData
      ? {
          status: deletionData.status || 'pending',
          requestedAt: toIso(deletionData.requestedAt),
          scheduledAt: toIso(deletionData.scheduledAt),
        }
      : null,
  }
}

function buildPortableExport({
  uid,
  user,
  auth,
  collections,
  ownedCategories,
  integration = null,
  relatedData = {},
  generatedAt = new Date(),
}) {
  return {
    schemaVersion: '1.0.0',
    generatedAt: generatedAt.toISOString(),
    subject: {
      uid,
      auth: serializeFirestoreValue(auth),
      profile: serializeFirestoreValue(user),
    },
    data: serializeFirestoreValue(collections),
    customCategories: serializeFirestoreValue(ownedCategories),
    integration: serializeFirestoreValue(integration),
    relatedData: serializeFirestoreValue(relatedData),
    notes: [
      'O arquivo contém os dados pessoais e financeiros vinculados à conta no momento da exportação.',
      'Segredos, hashes de vinculação e credenciais internas não são incluídos.',
    ],
  }
}

module.exports = {
  DAY_IN_MS,
  DELETION_CONFIRMATION,
  DELETION_GRACE_DAYS,
  LEGAL_VERSIONS,
  buildDeletionSchedule,
  buildPortableExport,
  buildPrivacyStatus,
  serializeFirestoreValue,
  validateDeletionConfirmation,
  validateLegalAcceptance,
}
