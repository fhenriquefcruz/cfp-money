const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore')
const { HttpsError, onCall } = require('firebase-functions/v2/https')
const { defineBoolean } = require('firebase-functions/params')
const {
  buildAccessUpdate,
  calculateEntitlement,
  normalizeAdminAction,
  publicAccessSnapshot,
} = require('./lib/access')

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

function requireAdmin(request) {
  const auth = requireAuth(request)

  if (auth.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Ação restrita a administradores.')
  }

  return auth
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


function serializeDate(value) {
  if (!value) return null

  const date =
    typeof value.toDate === 'function'
      ? value.toDate()
      : value instanceof Date
        ? value
        : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function profileFromAuthUser(userRecord) {
  const createdAt = new Date(userRecord.metadata.creationTime)
  const safeCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt
  const timestamp = Timestamp.fromDate(safeCreatedAt)

  return {
    email: userRecord.email || '',
    displayName: userRecord.displayName || '',
    plan: 'trial',
    trialStart: timestamp,
    premiumUntil: null,
    blocked: false,
    createdAt: timestamp,
  }
}

async function listAuthenticationUsers() {
  const users = []
  let pageToken

  do {
    const page = await getAuth().listUsers(1000, pageToken)
    users.push(...page.users)
    pageToken = page.pageToken
  } while (pageToken)

  return users
}

function serializeAdminUser(userRecord, profile = {}, hasFirestoreProfile = false) {
  return {
    uid: userRecord.uid,
    email: userRecord.email || profile.email || '',
    displayName: profile.displayName || userRecord.displayName || '',
    emailVerified: Boolean(userRecord.emailVerified),
    disabled: Boolean(userRecord.disabled),
    providers: (userRecord.providerData || []).map((provider) => provider.providerId),
    authCreatedAt: userRecord.metadata.creationTime || null,
    lastLoginAt: userRecord.metadata.lastSignInTime || null,
    plan: profile.plan || 'trial',
    trialStart:
      serializeDate(profile.trialStart) ||
      userRecord.metadata.creationTime ||
      null,
    premiumUntil: serializeDate(profile.premiumUntil),
    blocked: Boolean(profile.blocked),
    createdAt:
      serializeDate(profile.createdAt) ||
      userRecord.metadata.creationTime ||
      null,
    hasFirestoreProfile,
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

exports.adminListUsers = onCall(callableOptions(), async (request) => {
  requireAdmin(request)

  const [authUsers, profileSnapshot] = await Promise.all([
    listAuthenticationUsers(),
    db.collection('users').get(),
  ])

  const profileByUid = new Map(
    profileSnapshot.docs.map((snapshot) => [
      snapshot.id,
      snapshot.data(),
    ]),
  )

  const authUidSet = new Set(authUsers.map((user) => user.uid))

  const users = authUsers
    .map((user) =>
      serializeAdminUser(
        user,
        profileByUid.get(user.uid) || {},
        profileByUid.has(user.uid),
      ),
    )
    .sort((a, b) =>
      String(a.email || '').localeCompare(String(b.email || ''), 'pt-BR'),
    )

  const orphanProfiles = profileSnapshot.docs
    .filter((snapshot) => !authUidSet.has(snapshot.id))
    .map((snapshot) => ({
      uid: snapshot.id,
      email: snapshot.data().email || '',
      displayName: snapshot.data().displayName || '',
    }))

  return {
    users,
    total: users.length,
    missingProfiles: users
      .filter((user) => !user.hasFirestoreProfile)
      .map((user) => ({
        uid: user.uid,
        email: user.email,
      })),
    orphanProfiles,
  }
})

exports.adminSetUserAccess = onCall(callableOptions(), async (request) => {
  const actor = requireAdmin(request)

  let command
  try {
    command = normalizeAdminAction(request.data)
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message)
  }

  let authUser
  try {
    authUser = await getAuth().getUser(command.targetUid)
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      throw new HttpsError(
        'not-found',
        'Usuário não existe no Firebase Authentication.',
      )
    }
    throw error
  }

  const targetRef = db.collection('users').doc(command.targetUid)
  const auditRef = db.collection('adminAudit').doc()
  const bootstrapProfile = profileFromAuthUser(authUser)

  await db.runTransaction(async (transaction) => {
    const targetSnapshot = await transaction.get(targetRef)

    const before = targetSnapshot.exists
      ? targetSnapshot.data()
      : bootstrapProfile

    const update = buildAccessUpdate(before, command, new Date())

    const firestoreUpdate = {
      ...update,
      updatedAt: FieldValue.serverTimestamp(),
      accessUpdatedAt: FieldValue.serverTimestamp(),
      accessUpdatedBy: actor.uid,
    }

    if (update.premiumUntil instanceof Date) {
      firestoreUpdate.premiumUntil = Timestamp.fromDate(update.premiumUntil)
    }

    if (targetSnapshot.exists) {
      transaction.update(targetRef, firestoreUpdate)
    } else {
      transaction.set(targetRef, {
        ...bootstrapProfile,
        ...firestoreUpdate,
      })
    }

    transaction.set(auditRef, {
      actorUid: actor.uid,
      actorEmail: actor.token?.email || '',
      targetUid: command.targetUid,
      action: command.action,
      months: command.months || null,
      before: publicAccessSnapshot(before),
      requestedUpdate: publicAccessSnapshot({
        ...before,
        ...update,
      }),
      createdAt: FieldValue.serverTimestamp(),
    })
  })

  return {
    ok: true,
    targetUid: command.targetUid,
    action: command.action,
  }
})


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
