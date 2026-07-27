const crypto = require('node:crypto')
const { getAuth } = require('firebase-admin/auth')
const {
  FieldValue,
  Timestamp,
} = require('firebase-admin/firestore')
const {
  HttpsError,
  onCall,
} = require('firebase-functions/v2/https')
const {
  onSchedule,
} = require('firebase-functions/v2/scheduler')
const {
  DELETION_CONFIRMATION,
  LEGAL_VERSIONS,
  buildDeletionSchedule,
  buildPortableExport,
  buildPrivacyStatus,
  serializeFirestoreValue,
  validateDeletionConfirmation,
  validateLegalAcceptance,
} = require('./lib/privacyDomain')

const REGION = 'southamerica-east1'
const MAX_EXPORT_DOCUMENTS = 10_000

function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError(
      'unauthenticated',
      'Faça login para continuar.',
    )
  }

  return request.auth
}

function anonymizeSubject(uid) {
  return crypto
    .createHash('sha256')
    .update(String(uid))
    .digest('hex')
}

function authExport(userRecord) {
  return {
    uid: userRecord.uid,
    email: userRecord.email || null,
    emailVerified: Boolean(userRecord.emailVerified),
    displayName: userRecord.displayName || null,
    photoURL: userRecord.photoURL || null,
    disabled: Boolean(userRecord.disabled),
    providerData: userRecord.providerData.map(
      (provider) => ({
        providerId: provider.providerId,
        uid: provider.uid,
        displayName: provider.displayName || null,
        email: provider.email || null,
        photoURL: provider.photoURL || null,
      }),
    ),
    metadata: {
      creationTime:
        userRecord.metadata.creationTime || null,
      lastSignInTime:
        userRecord.metadata.lastSignInTime || null,
      lastRefreshTime:
        userRecord.metadata.lastRefreshTime || null,
    },
  }
}

async function exportUserCollections(userRef) {
  const collections = await userRef.listCollections()
  const output = {}
  let documentCount = 0

  for (const collectionRef of collections) {
    const snapshot = await collectionRef.get()
    documentCount += snapshot.size

    if (documentCount > MAX_EXPORT_DOCUMENTS) {
      throw new HttpsError(
        'resource-exhausted',
        'A conta possui dados demais para exportação instantânea. Solicite uma exportação assistida.',
      )
    }

    output[collectionRef.id] = snapshot.docs.map(
      (document) => ({
        id: document.id,
        ...serializeFirestoreValue(document.data()),
      }),
    )
  }

  return output
}

async function deleteQuery(db, query) {
  const snapshot = await query.get()
  if (snapshot.empty) return 0

  const writer = db.bulkWriter()
  snapshot.docs.forEach((document) =>
    writer.delete(document.ref),
  )
  await writer.close()
  return snapshot.size
}

async function deleteRelatedRootData(db, uid) {
  const integrationRef = db
    .collection('userIntegrations')
    .doc(`${uid}_telegram`)
  const integrationSnapshot = await integrationRef.get()
  const telegramUserId = String(
    integrationSnapshot.data()?.telegramUserId || '',
  )

  const directRefs = [
    db.collection('integrationLinkCodes').doc(uid),
    integrationRef,
  ]

  if (telegramUserId) {
    directRefs.push(
      db
        .collection('integrationLinks')
        .doc(telegramUserId),
    )
  }

  const writer = db.bulkWriter()
  directRefs.forEach((ref) => writer.delete(ref))
  await writer.close()

  await Promise.all([
    deleteQuery(
      db,
      db
        .collection('integrationLinks')
        .where('uid', '==', uid),
    ),
    deleteQuery(
      db,
      db
        .collection('telegramDrafts')
        .where('uid', '==', uid),
    ),
    deleteQuery(
      db,
      db
        .collection('categories')
        .where('ownerUid', '==', uid),
    ),
    deleteQuery(
      db,
      db
        .collection('privacyConsents')
        .where('uid', '==', uid),
    ),
    deleteQuery(
      db,
      db
        .collection('adminAudit')
        .where('targetUid', '==', uid),
    ),
    deleteQuery(
      db,
      db
        .collection('adminAudit')
        .where('actorUid', '==', uid),
    ),
  ])
}

async function deleteAccountData(db, uid) {
  const userRef = db.collection('users').doc(uid)

  await deleteRelatedRootData(db, uid)
  await db.recursiveDelete(userRef)

  try {
    await getAuth().deleteUser(uid)
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw error
    }
  }
}

function createPrivacyFunctions({
  db,
  callableOptions,
}) {
  const getPrivacyStatus = onCall(
    callableOptions(),
    async (request) => {
      const auth = requireAuth(request)
      const [userSnapshot, deletionSnapshot] =
        await db.getAll(
          db.collection('users').doc(auth.uid),
          db
            .collection('accountDeletionRequests')
            .doc(auth.uid),
        )

      if (!userSnapshot.exists) {
        throw new HttpsError(
          'not-found',
          'Documento do usuário não encontrado.',
        )
      }

      return buildPrivacyStatus(
        userSnapshot.data(),
        deletionSnapshot.exists
          ? deletionSnapshot.data()
          : null,
      )
    },
  )

  const recordLegalAcceptance = onCall(
    callableOptions(),
    async (request) => {
      const auth = requireAuth(request)
      let accepted

      try {
        accepted = validateLegalAcceptance(
          request.data,
        )
      } catch (error) {
        throw new HttpsError(
          'invalid-argument',
          error.message,
        )
      }

      const userRef = db
        .collection('users')
        .doc(auth.uid)
      const consentRef = db
        .collection('privacyConsents')
        .doc()

      const batch = db.batch()
      batch.set(
        userRef,
        {
          acceptedTermsVersion:
            accepted.termsVersion,
          acceptedPrivacyVersion:
            accepted.privacyVersion,
          legalAcceptedAt:
            FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      batch.set(consentRef, {
        uid: auth.uid,
        termsVersion: accepted.termsVersion,
        privacyVersion: accepted.privacyVersion,
        acceptedAt: FieldValue.serverTimestamp(),
        source: 'web',
      })
      await batch.commit()

      return {
        ok: true,
        ...accepted,
      }
    },
  )

  const exportMyData = onCall(
    callableOptions({
      timeoutSeconds: 120,
      memory: '512MiB',
    }),
    async (request) => {
      const auth = requireAuth(request)
      const userRef = db
        .collection('users')
        .doc(auth.uid)
      const [
        userSnapshot,
        categoriesSnapshot,
        integrationSnapshot,
        consentSnapshot,
        telegramDraftSnapshot,
        deletionSnapshot,
        authRecord,
      ] = await Promise.all([
        userRef.get(),
        db
          .collection('categories')
          .where('ownerUid', '==', auth.uid)
          .get(),
        db
          .collection('userIntegrations')
          .doc(`${auth.uid}_telegram`)
          .get(),
        db
          .collection('privacyConsents')
          .where('uid', '==', auth.uid)
          .get(),
        db
          .collection('telegramDrafts')
          .where('uid', '==', auth.uid)
          .get(),
        db
          .collection('accountDeletionRequests')
          .doc(auth.uid)
          .get(),
        getAuth().getUser(auth.uid),
      ])

      if (!userSnapshot.exists) {
        throw new HttpsError(
          'not-found',
          'Documento do usuário não encontrado.',
        )
      }

      const collections =
        await exportUserCollections(userRef)
      const integration = integrationSnapshot.exists
        ? {
            provider:
              integrationSnapshot.data().provider ||
              'telegram',
            linked:
              integrationSnapshot.data().status ===
              'active',
            username:
              integrationSnapshot.data().username ||
              null,
            firstName:
              integrationSnapshot.data().firstName ||
              null,
            linkedAt:
              integrationSnapshot.data().linkedAt ||
              null,
            preferences:
              integrationSnapshot.data().preferences ||
              {},
          }
        : null

      return buildPortableExport({
        uid: auth.uid,
        user: userSnapshot.data(),
        auth: authExport(authRecord),
        collections,
        ownedCategories:
          categoriesSnapshot.docs.map(
            (document) => ({
              id: document.id,
              ...document.data(),
            }),
          ),
        integration,
        relatedData: {
          privacyConsents: consentSnapshot.docs.map(
            (document) => ({
              id: document.id,
              ...document.data(),
            }),
          ),
          telegramDrafts: telegramDraftSnapshot.docs.map(
            (document) => ({
              id: document.id,
              ...document.data(),
            }),
          ),
          accountDeletionRequest:
            deletionSnapshot.exists
              ? {
                  id: deletionSnapshot.id,
                  ...deletionSnapshot.data(),
                }
              : null,
        },
      })
    },
  )

  const requestAccountDeletion = onCall(
    callableOptions(),
    async (request) => {
      const auth = requireAuth(request)

      try {
        validateDeletionConfirmation(
          request.data?.confirmation,
        )
      } catch (error) {
        throw new HttpsError(
          'invalid-argument',
          error.message,
        )
      }

      const requestedAt = new Date()
      const scheduledAt =
        buildDeletionSchedule(requestedAt)
      const requestRef = db
        .collection('accountDeletionRequests')
        .doc(auth.uid)
      const userRef = db
        .collection('users')
        .doc(auth.uid)

      const batch = db.batch()
      batch.set(requestRef, {
        uid: auth.uid,
        status: 'pending',
        requestedAt:
          Timestamp.fromDate(requestedAt),
        scheduledAt:
          Timestamp.fromDate(scheduledAt),
        updatedAt: FieldValue.serverTimestamp(),
      })
      batch.set(
        userRef,
        {
          accountDeletionRequestedAt:
            Timestamp.fromDate(requestedAt),
          accountDeletionScheduledAt:
            Timestamp.fromDate(scheduledAt),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      await batch.commit()

      return {
        ok: true,
        confirmationPhrase:
          DELETION_CONFIRMATION,
        scheduledAt: scheduledAt.toISOString(),
      }
    },
  )

  const cancelAccountDeletion = onCall(
    callableOptions(),
    async (request) => {
      const auth = requireAuth(request)
      const requestRef = db
        .collection('accountDeletionRequests')
        .doc(auth.uid)
      const userRef = db
        .collection('users')
        .doc(auth.uid)

      const batch = db.batch()
      batch.delete(requestRef)
      batch.set(
        userRef,
        {
          accountDeletionRequestedAt:
            FieldValue.delete(),
          accountDeletionScheduledAt:
            FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      await batch.commit()

      return { ok: true }
    },
  )

  const processAccountDeletions = onSchedule(
    {
      region: REGION,
      schedule: '30 3 * * *',
      timeZone: 'America/Campo_Grande',
      timeoutSeconds: 540,
      memory: '512MiB',
      maxInstances: 1,
    },
    async () => {
      const now = Timestamp.now()
      const snapshot = await db
        .collection('accountDeletionRequests')
        .where('status', '==', 'pending')
        .where('scheduledAt', '<=', now)
        .limit(20)
        .get()

      for (const requestDocument of snapshot.docs) {
        const uid = requestDocument.id

        try {
          await requestDocument.ref.update({
            status: 'processing',
            processingAt:
              FieldValue.serverTimestamp(),
          })
          await deleteAccountData(db, uid)
          await db.collection('privacyAudit').add({
            action: 'account_deleted',
            subjectHash: anonymizeSubject(uid),
            completedAt:
              FieldValue.serverTimestamp(),
            legalVersions: LEGAL_VERSIONS,
          })
          await requestDocument.ref.delete()
        } catch (error) {
          console.error(
            '[Meu Real] Falha ao excluir conta:',
            uid,
            error,
          )
          await requestDocument.ref.set(
            {
              status: 'failed',
              lastError:
                String(error?.message || error).slice(
                  0,
                  500,
                ),
              failedAt:
                FieldValue.serverTimestamp(),
            },
            { merge: true },
          )
        }
      }
    },
  )

  return {
    getPrivacyStatus,
    recordLegalAcceptance,
    exportMyData,
    requestAccountDeletion,
    cancelAccountDeletion,
    processAccountDeletions,
  }
}

module.exports = {
  createPrivacyFunctions,
}
