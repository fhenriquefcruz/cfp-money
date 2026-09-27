const { FieldValue, Timestamp } = require('firebase-admin/firestore')
const { HttpsError, onCall } = require('firebase-functions/v2/https')
const { buildAccessUpdate, normalizeAdminAction, publicAccessSnapshot } = require('./lib/access')
const { serializeFirestoreValue } = require('./lib/privacyDomain')

const SUPPORT_STATUSES = new Set(['open', 'in_progress', 'answered', 'closed'])

function requireAdmin(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Faça login para continuar.')
  }

  if (request.auth.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Ação restrita a administradores.')
  }

  return request.auth
}

function publicAdminUserSnapshot(document) {
  const data = document.data() || {}

  return {
    uid: document.id,
    email: data.email || '',
    displayName: data.displayName || '',
    plan: data.plan || 'trial',
    trialStart: serializeFirestoreValue(data.trialStart),
    premiumUntil: serializeFirestoreValue(data.premiumUntil),
    blocked: Boolean(data.blocked),
    createdAt: serializeFirestoreValue(data.createdAt),
  }
}

function normalizeSupportResponse(data = {}) {
  const requestId = String(data.requestId || '').trim()
  const status = String(data.status || '').trim()
  const response = String(data.response || '').trim()

  if (!requestId) {
    throw new Error('Atendimento não informado.')
  }

  if (!SUPPORT_STATUSES.has(status)) {
    throw new Error('Status de atendimento inválido.')
  }

  if (response.length < 2 || response.length > 4000) {
    throw new Error('A resposta deve ter entre 2 e 4000 caracteres.')
  }

  return { requestId, status, response }
}

function createAdminFunctions({ db, callableOptions }) {
  const adminListUsers = onCall(callableOptions(), async (request) => {
    requireAdmin(request)
    const snapshot = await db.collection('users').orderBy('email').get()

    return {
      users: snapshot.docs.map(publicAdminUserSnapshot),
    }
  })

  const adminSetUserAccess = onCall(callableOptions(), async (request) => {
    const actor = requireAdmin(request)

    let command
    try {
      command = normalizeAdminAction(request.data)
    } catch (error) {
      throw new HttpsError('invalid-argument', error.message)
    }

    const targetRef = db.collection('users').doc(command.targetUid)
    const auditRef = db.collection('adminAudit').doc()

    await db.runTransaction(async (transaction) => {
      const targetSnapshot = await transaction.get(targetRef)

      if (!targetSnapshot.exists) {
        throw new HttpsError('not-found', 'Usuário de destino não encontrado.')
      }

      const before = targetSnapshot.data()
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
  })

  const adminListSupportRequests = onCall(callableOptions(), async (request) => {
    requireAdmin(request)

    const snapshot = await db
      .collection('supportRequests')
      .orderBy('createdAt', 'desc')
      .get()

    return {
      requests: snapshot.docs.map((document) => ({
        id: document.id,
        ...serializeFirestoreValue(document.data()),
      })),
    }
  })

  const adminRespondSupportRequest = onCall(callableOptions(), async (request) => {
    const actor = requireAdmin(request)

    let command
    try {
      command = normalizeSupportResponse(request.data)
    } catch (error) {
      throw new HttpsError('invalid-argument', error.message)
    }

    const requestRef = db.collection('supportRequests').doc(command.requestId)
    const snapshot = await requestRef.get()

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Atendimento não encontrado.')
    }

    await requestRef.update({
      status: command.status,
      response: command.response,
      respondedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      responderUid: actor.uid,
    })

    return {
      ok: true,
      requestId: command.requestId,
      status: command.status,
    }
  })

  return {
    adminListUsers,
    adminSetUserAccess,
    adminListSupportRequests,
    adminRespondSupportRequest,
  }
}

module.exports = {
  createAdminFunctions,
  normalizeSupportResponse,
  publicAdminUserSnapshot,
}
