const crypto = require('node:crypto')
const { initializeApp } = require('firebase-admin/app')
const {
  FieldValue,
  Timestamp,
  getFirestore,
} = require('firebase-admin/firestore')
const {
  HttpsError,
  onCall,
} = require('firebase-functions/v2/https')
const {
  defineBoolean,
  defineSecret,
} = require('firebase-functions/params')
const {
  buildAccessUpdate,
  calculateEntitlement,
  normalizeAdminAction,
  publicAccessSnapshot,
} = require('./lib/access')

initializeApp()

const db = getFirestore()
const REGION = 'southamerica-east1'
const ENFORCE_APP_CHECK = defineBoolean(
  'ENFORCE_APP_CHECK',
  {
    default: false,
    description:
      'Exige token válido do Firebase App Check nas funções chamáveis.',
  },
)
const INTEGRATION_LINK_SECRET = defineSecret(
  'INTEGRATION_LINK_SECRET',
)

function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError(
      'unauthenticated',
      'Faça login para continuar.',
    )
  }

  return request.auth
}

function requireAdmin(request) {
  const auth = requireAuth(request)

  if (auth.token?.admin !== true) {
    throw new HttpsError(
      'permission-denied',
      'Ação restrita a administradores.',
    )
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

function generateLinkCode(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(length)

  return Array.from(bytes, (byte) =>
    alphabet[byte % alphabet.length],
  ).join('')
}

function hashLinkCode(code, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(String(code).trim().toUpperCase())
    .digest('hex')
}

exports.getBackendStatus = onCall(
  callableOptions(),
  async (request) => {
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
  },
)

exports.getAccountEntitlement = onCall(
  callableOptions(),
  async (request) => {
    const auth = requireAuth(request)
    const snapshot = await db
      .collection('users')
      .doc(auth.uid)
      .get()

    if (!snapshot.exists) {
      throw new HttpsError(
        'not-found',
        'Documento do usuário não encontrado.',
      )
    }

    const status = calculateEntitlement(snapshot.data(), {
      isAdmin: auth.token?.admin === true,
    })

    return serializeEntitlement(status)
  },
)

exports.adminSetUserAccess = onCall(
  callableOptions(),
  async (request) => {
    const actor = requireAdmin(request)

    let command
    try {
      command = normalizeAdminAction(request.data)
    } catch (error) {
      throw new HttpsError(
        'invalid-argument',
        error.message,
      )
    }

    const targetRef = db
      .collection('users')
      .doc(command.targetUid)
    const auditRef = db
      .collection('adminAudit')
      .doc()

    await db.runTransaction(async (transaction) => {
      const targetSnapshot = await transaction.get(targetRef)

      if (!targetSnapshot.exists) {
        throw new HttpsError(
          'not-found',
          'Usuário de destino não encontrado.',
        )
      }

      const before = targetSnapshot.data()
      const update = buildAccessUpdate(
        before,
        command,
        new Date(),
      )
      const firestoreUpdate = {
        ...update,
        updatedAt: FieldValue.serverTimestamp(),
        accessUpdatedAt: FieldValue.serverTimestamp(),
        accessUpdatedBy: actor.uid,
      }

      if (update.premiumUntil instanceof Date) {
        firestoreUpdate.premiumUntil = Timestamp.fromDate(
          update.premiumUntil,
        )
      }

      transaction.update(targetRef, firestoreUpdate)
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
  },
)

exports.createIntegrationLinkCode = onCall(
  callableOptions({
    secrets: [INTEGRATION_LINK_SECRET],
  }),
  async (request) => {
    const auth = requireAuth(request)
    const userSnapshot = await db
      .collection('users')
      .doc(auth.uid)
      .get()

    if (!userSnapshot.exists) {
      throw new HttpsError(
        'not-found',
        'Documento do usuário não encontrado.',
      )
    }

    const entitlement = calculateEntitlement(
      userSnapshot.data(),
      {
        isAdmin: auth.token?.admin === true,
      },
    )

    if (!entitlement.isPremium || entitlement.blocked) {
      throw new HttpsError(
        'permission-denied',
        'A integração está disponível apenas para contas Premium ativas.',
      )
    }

    const provider = String(
      request.data?.provider || 'telegram',
    )
      .trim()
      .toLowerCase()

    if (provider !== 'telegram') {
      throw new HttpsError(
        'invalid-argument',
        'Provedor de integração não suportado.',
      )
    }

    const code = generateLinkCode()
    const secret = INTEGRATION_LINK_SECRET.value()
    const codeHash = hashLinkCode(code, secret)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await db
      .collection('integrationLinkCodes')
      .doc(auth.uid)
      .set({
        uid: auth.uid,
        provider,
        codeHash,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        usedAt: null,
      })

    return {
      provider,
      code,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: 600,
    }
  },
)

const {
  createTelegramFunctions,
} = require('./telegram')

const telegramFunctions = createTelegramFunctions({
  db,
  callableOptions,
  integrationLinkSecret: INTEGRATION_LINK_SECRET,
  calculateEntitlement,
})

exports.getTelegramIntegrationStatus =
  telegramFunctions.getTelegramIntegrationStatus
exports.updateTelegramPreferences =
  telegramFunctions.updateTelegramPreferences
exports.unlinkTelegramIntegration =
  telegramFunctions.unlinkTelegramIntegration
exports.telegramWebhook =
  telegramFunctions.telegramWebhook
exports.telegramDailyDigest =
  telegramFunctions.telegramDailyDigest
