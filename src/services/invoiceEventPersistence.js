import {
  collection,
  doc,
  getDocsFromServer,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { validateReversalAgainstPayment } from '../domain/invoiceReversalGuard.js'

export async function persistInvoiceEventOperation(database, uid, event) {
  if (typeof uid !== 'string' || !uid.trim() || uid.includes('/')) {
    throw new Error('Usuário não autenticado.')
  }

  const { sameInvoiceEventIntent, validateInvoiceEventOperation } =
    await import('../domain/invoiceEventIdempotency.js')
  const { documentId, payload } = validateInvoiceEventOperation(event)
  const reference = doc(database, 'users', uid, 'invoiceEvents', documentId)
  const isReversal = payload.type === 'reversal'
  const originalId = isReversal ? payload.reversesEventId : ''

  // Antes da transação: inventário apenas de leitura, obrigatoriamente do servidor.
  // A trava abaixo serializa NOVOS estornos; histórico legado pode continuar mutável.
  let history = []
  if (isReversal) {
    const snapshot = await getDocsFromServer(
      query(
        collection(database, 'users', uid, 'invoiceEvents'),
        where('reversesEventId', '==', originalId),
      ),
    )
    history = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))
  }

  await runTransaction(database, async (transaction) => {
    const existing = await transaction.get(reference)

    if (existing.exists()) {
      if (!sameInvoiceEventIntent(existing.data(), payload)) {
        throw new Error('Esta operação já foi registrada com outros dados. Confira o histórico.')
      }
      return
    }

    let lockReference = null
    let requestedCents = 0
    if (isReversal) {
      const paymentReference = doc(database, 'users', uid, 'invoiceEvents', originalId)
      lockReference = doc(database, 'users', uid, 'invoiceReversalLocks', originalId)
      const payment = await transaction.get(paymentReference)
      const lock = await transaction.get(lockReference)
      if (lock.exists()) {
        throw new Error('Este pagamento já possui um novo estorno. Confira o histórico.')
      }

      requestedCents = validateReversalAgainstPayment(
        payment.exists() ? { ...payment.data(), id: payment.id } : null,
        payload,
        history,
      ).requestedCents
    }

    transaction.set(reference, { ...payload, createdAt: serverTimestamp() })

    if (isReversal) {
      transaction.set(lockReference, {
        paymentId: originalId,
        reversalEventId: documentId,
        invoiceKey: payload.invoiceKey,
        amountCents: requestedCents,
        createdAt: serverTimestamp(),
      })
    }
  })

  return documentId
}
