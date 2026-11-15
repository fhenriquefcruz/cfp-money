import {
  collection,
  doc,
  getDocsFromServer,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { validateInvoiceReversalBalance } from '../domain/invoiceReversalGuard.js'
import { sameInvoiceOperation } from '../domain/invoiceEventIdempotency.js'

/**
 * Módulo carregado sob demanda somente em operações de estorno.
 * Uma trava estável por pagamento serializa UUIDs concorrentes.
 */
export async function writeReversalOnce(database, uid, operation) {
  const event = operation.data
  const originalPaymentId = event.reversesEventId
  const reference = doc(database, 'users', uid, 'invoiceEvents', operation.id)
  const paymentRef = doc(database, 'users', uid, 'invoiceEvents', originalPaymentId)
  const guardRef = doc(database, 'users', uid, 'invoiceReversalLocks', originalPaymentId)

  // O histórico anterior às travas precisa vir do servidor, não do cache offline.
  const prior = await getDocsFromServer(
    query(
      collection(database, 'users', uid, 'invoiceEvents'),
      where('reversesEventId', '==', originalPaymentId),
    ),
  )
  const history = prior.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))

  return runTransaction(database, async (transaction) => {
    const existing = await transaction.get(reference)
    if (existing.exists()) {
      if (!sameInvoiceOperation(existing.data(), event)) {
        throw new Error('Este identificador já foi utilizado para um evento diferente.')
      }
      return { id: reference.id, replayed: true }
    }

    const paymentSnapshot = await transaction.get(paymentRef)
    const lockSnapshot = await transaction.get(guardRef)
    if (lockSnapshot.exists()) {
      throw new Error('Este pagamento já teve um estorno registrado. Revise o histórico.')
    }

    const amount = validateInvoiceReversalBalance(
      paymentSnapshot.exists() ? { ...paymentSnapshot.data(), id: paymentSnapshot.id } : null,
      event,
      history,
    )

    transaction.set(reference, { ...event, createdAt: serverTimestamp() })
    transaction.set(guardRef, {
      paymentId: originalPaymentId,
      reversalEventId: reference.id,
      invoiceKey: event.invoiceKey,
      amountCents: amount.requestedCents,
      createdAt: serverTimestamp(),
    })

    return { id: reference.id, replayed: false }
  })
}
