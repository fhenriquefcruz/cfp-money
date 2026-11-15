import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import {
  sameInvoiceEventIntent,
  validateInvoiceEventOperation,
} from '../domain/invoiceEventIdempotency.js'

export async function persistInvoiceEventOperation(database, uid, event) {
  if (typeof uid !== 'string' || !uid.trim() || uid.includes('/')) {
    throw new Error('Usuário não autenticado.')
  }

  const { documentId, payload } = validateInvoiceEventOperation(event)
  const reference = doc(database, 'users', uid, 'invoiceEvents', documentId)

  await runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(reference)

    if (snapshot.exists()) {
      if (!sameInvoiceEventIntent(snapshot.data(), payload)) {
        throw new Error('Esta operação já foi registrada com outros dados. Confira o histórico.')
      }
      return
    }

    transaction.set(reference, { ...payload, createdAt: serverTimestamp() })
  })

  return documentId
}
