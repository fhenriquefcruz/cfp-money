import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { buildAdminAccessUpdate, normalizeAdminAction } from '../domain/adminAccess'
import { auth, db } from './firebase'

function requireCurrentUser() {
  const user = auth.currentUser
  if (!user?.uid) {
    throw new Error('Usuário não autenticado.')
  }
  return user
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
