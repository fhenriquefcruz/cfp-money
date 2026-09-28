const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { HttpsError, onCall } = require('firebase-functions/v2/https')
const { defineBoolean } = require('firebase-functions/params')
const { calculateEntitlement } = require('./lib/access')

initializeApp()

const db = getFirestore()
const REGION = 'southamerica-east1'
const ENFORCE_APP_CHECK = defineBoolean('ENFORCE_APP_CHECK', {
  default: false,
  description: 'Exige token válido do Firebase App Check nas funções chamáveis.',
})

function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Faça login para continuar.')
  }

  return request.auth
}

function callableOptions(extra = {}) {
  return {
    region: REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 10,
    enforceAppCheck: ENFORCE_APP_CHECK,
    ...extra,
  }
}

function serializeEntitlement(status) {
  return {
    plan: status.plan,
    isPremium: status.isPremium,
    isTrial: status.isTrial,
    isExpired: status.isExpired,
    daysLeft: status.daysLeft,
    blocked: status.blocked,
    isAdminBypass: status.isAdminBypass,
  }
}

exports.getBackendStatus = onCall(callableOptions(), async (request) => {
  const auth = requireAuth(request)

  return {
    ok: true,
    service: 'meu-real-backend',
    version: '15.0.0',
    region: REGION,
    uid: auth.uid,
    appCheckEnforced: ENFORCE_APP_CHECK.value(),
    serverTime: new Date().toISOString(),
  }
})

exports.getAccountEntitlement = onCall(callableOptions(), async (request) => {
  const auth = requireAuth(request)
  const snapshot = await db.collection('users').doc(auth.uid).get()

  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Documento do usuário não encontrado.')
  }

  const status = calculateEntitlement(snapshot.data(), {
    isAdmin: auth.token?.admin === true,
  })

  return serializeEntitlement(status)
})

const { createAdminFunctions } = require('./admin')

const adminFunctions = createAdminFunctions({
  db,
  callableOptions,
})

exports.adminListUsers = adminFunctions.adminListUsers
exports.adminSetUserAccess = adminFunctions.adminSetUserAccess
exports.adminListSupportRequests = adminFunctions.adminListSupportRequests
exports.adminRespondSupportRequest = adminFunctions.adminRespondSupportRequest

const { createPrivacyFunctions } = require('./privacy')

const privacyFunctions = createPrivacyFunctions({
  db,
  callableOptions,
})

exports.getPrivacyStatus = privacyFunctions.getPrivacyStatus
exports.recordLegalAcceptance = privacyFunctions.recordLegalAcceptance
exports.exportMyData = privacyFunctions.exportMyData
exports.requestAccountDeletion = privacyFunctions.requestAccountDeletion
exports.cancelAccountDeletion = privacyFunctions.cancelAccountDeletion
exports.processAccountDeletions = privacyFunctions.processAccountDeletions

const { createCommercialFunctions } = require('./commercial')

const commercialFunctions = createCommercialFunctions({
  db,
  callableOptions,
  appCheckEnforced: () => ENFORCE_APP_CHECK.value(),
})

exports.getCommercialMetrics = commercialFunctions.getCommercialMetrics
