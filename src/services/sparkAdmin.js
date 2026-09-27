import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { buildAdminAccessUpdate, normalizeAdminAction } from '../domain/adminAccess'
import { auth, db } from './firebase'

function requireCurrentUser() {
  const user = auth.currentUser
  if (!user?.uid) {
    throw new Error('Usuário não autenticado.')
  }
  return user
}

export async function sparkAdminListUsers() {
  requireCurrentUser()
  const snapshot = await getDocs(query(collection(db, 'users'), orderBy('email')))

  return snapshot.docs.map((item) => {
    const data = item.data()
    return {
      uid: item.id,
      email: data.email || '',
      displayName: data.displayName || '',
      plan: data.plan || 'trial',
      trialStart: data.trialStart || null,
      premiumUntil: data.premiumUntil || null,
      blocked: Boolean(data.blocked),
      createdAt: data.createdAt || null,
    }
  })
}

export async function sparkAdminListSupportRequests() {
  requireCurrentUser()
  const snapshot = await getDocs(
    query(collection(db, 'supportRequests'), orderBy('createdAt', 'desc')),
  )

  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function sparkAdminRespondSupportRequest({ requestId, status, response }) {
  const actor = requireCurrentUser()
  await updateDoc(doc(db, 'supportRequests', requestId), {
    status,
    response: String(response || '').trim(),
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    responderUid: actor.uid,
  })

  return { ok: true, requestId, status }
}

export async function sparkAdminSetUserAccess(data) {
  const actor = requireCurrentUser()
  const command = normalizeAdminAction(data)
  const targetRef = doc(db, 'users', command.targetUid)

  await runTransaction(db, async (transaction) => {
    const targetSnapshot = await transaction.get(targetRef)

    if (!targetSnapshot.exists()) {
      throw new Error('Usuário de destino não encontrado.')
    }

    const update = buildAdminAccessUpdate(targetSnapshot.data(), command, new Date())

    transaction.update(targetRef, {
      ...update,
      updatedAt: serverTimestamp(),
      accessUpdatedAt: serverTimestamp(),
      accessUpdatedBy: actor.uid,
    })
  })

  return {
    ok: true,
    targetUid: command.targetUid,
    action: command.action,
  }
}
