const { HttpsError, onCall } = require('firebase-functions/v2/https')
const { LEGAL_VERSIONS } = require('./lib/privacyDomain')
const { buildCommercialMetrics } = require('./lib/commercialDomain')

function requireAdmin(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Faça login para continuar.')
  }

  if (request.auth.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Ação restrita a administradores.')
  }
}

async function count(query) {
  const snapshot = await query.count().get()
  return snapshot.data().count
}

function createCommercialFunctions({ db, callableOptions, appCheckEnforced }) {
  const getCommercialMetrics = onCall(
    callableOptions({
      timeoutSeconds: 30,
      memory: '256MiB',
    }),
    async (request) => {
      requireAdmin(request)

      const users = db.collection('users')
      const deletionRequests = db.collection('accountDeletionRequests')

      const [
        totalUsers,
        telegramLinked,
        legalAccepted,
        deletionPending,
        deletionProcessing,
        deletionFailed,
        completedDeletions,
      ] = await Promise.all([
        count(users),
        count(db.collection('userIntegrations').where('status', '==', 'active')),
        count(
          users
            .where('acceptedTermsVersion', '==', LEGAL_VERSIONS.terms)
            .where('acceptedPrivacyVersion', '==', LEGAL_VERSIONS.privacy),
        ),
        count(deletionRequests.where('status', '==', 'pending')),
        count(deletionRequests.where('status', '==', 'processing')),
        count(deletionRequests.where('status', '==', 'failed')),
        count(db.collection('privacyAudit').where('action', '==', 'account_deleted')),
      ])

      return buildCommercialMetrics({
        totalUsers,
        telegramLinked,
        legalAccepted,
        deletionPending,
        deletionProcessing,
        deletionFailed,
        completedDeletions,
        appCheckEnforced: typeof appCheckEnforced === 'function' ? appCheckEnforced() : false,
      })
    },
  )

  return {
    getCommercialMetrics,
  }
}

module.exports = {
  createCommercialFunctions,
}
