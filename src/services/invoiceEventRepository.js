import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import {
  prepareInvoiceEventOperation,
  sameInvoiceOperation,
} from '../domain/invoiceEventIdempotency.js'

/**
 * Novos pagamentos, ajustes e fechamentos usam a mesma identidade estável.
 * O módulo de estorno, que precisa de consultas e trava adicional, só carrega
 * quando há estorno, preservando o orçamento de JavaScript inicial.
 */
export async function writeInvoiceEventOnce(database, uid, event) {
  if (typeof uid !== 'string' || !uid.trim()) {
    throw new Error('Usuário autenticado obrigatório.')
  }

  const operation = prepareInvoiceEventOperation(event)
  if (operation.data.type === 'reversal') {
    const { writeReversalOnce } = await import('./invoiceReversalRepository.js')
    return writeReversalOnce(database, uid, operation)
  }

  const reference = doc(database, 'users', uid, 'invoiceEvents', operation.id)
  return runTransaction(database, async (transaction) => {
    const existing = await transaction.get(reference)

    if (existing.exists()) {
      if (!sameInvoiceOperation(existing.data(), operation.data)) {
        throw new Error('Este identificador já foi utilizado para um evento diferente.')
      }
      return { id: reference.id, replayed: true }
    }

    transaction.set(reference, {
      ...operation.data,
      createdAt: serverTimestamp(),
    })

    return { id: reference.id, replayed: false }
  })
}
