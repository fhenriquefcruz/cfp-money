import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { validateInvoiceReversalBalance } from '../domain/invoiceReversalGuard.js'
import {
  prepareInvoiceEventOperation,
  sameInvoiceOperation,
} from '../domain/invoiceEventIdempotency.js'

/** A mesma operação só pode ser escrita uma vez, inclusive sob retry. */
export async function writeInvoiceEventOnce(database, uid, event) {
  if (typeof uid !== 'string' || !uid.trim()) throw new Error('Usuário autenticado obrigatório.')

  const { id, data } = prepareInvoiceEventOperation(event)
  const reference = doc(database, 'users', uid, 'invoiceEvents', id)
  const reversal = data.type === 'reversal'
  const originalId = data.reversesEventId
  let history = []

  if (reversal) {
    // getDocs tenta o servidor; dados somente do cache não autorizam estornos.
    const results = await getDocs(
      query(
        collection(database, 'users', uid, 'invoiceEvents'),
        where('reversesEventId', '==', originalId),
      ),
    )
    if (results.metadata.fromCache) {
      throw new Error('Histórico de estornos indisponível no servidor. Tente novamente online.')
    }
    history = results.docs.map((snapshot) => snapshot.data())
  }

  return runTransaction(database, async (transaction) => {
    const existing = await transaction.get(reference)
    if (existing.exists()) {
      if (!sameInvoiceOperation(existing.data(), data)) {
        throw new Error('Este identificador já foi utilizado para um evento diferente.')
      }
      return { id, replayed: true }
    }

    let guardRef
    let requestedCents
    if (reversal) {
      const paymentRef = doc(database, 'users', uid, 'invoiceEvents', originalId)
      guardRef = doc(database, 'users', uid, 'invoiceReversalLocks', originalId)
      const payment = await transaction.get(paymentRef)
      const lock = await transaction.get(guardRef)
      if (lock.exists()) {
        throw new Error('Este pagamento já teve um estorno registrado. Revise o histórico.')
      }
      requestedCents = validateInvoiceReversalBalance(
        payment.exists() ? { ...payment.data(), id: payment.id } : null,
        data,
        history,
      ).requestedCents
    }

    transaction.set(reference, { ...data, createdAt: serverTimestamp() })
    if (reversal) {
      transaction.set(guardRef, {
        paymentId: originalId,
        reversalEventId: id,
        invoiceKey: data.invoiceKey,
        amountCents: requestedCents,
        createdAt: serverTimestamp(),
      })
    }
    return { id, replayed: false }
  })
}
