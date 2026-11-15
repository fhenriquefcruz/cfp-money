import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import {
  prepareInvoiceEventOperation,
  sameInvoiceOperation,
} from '../domain/invoiceEventIdempotency.js'

/**
 * Grava uma única vez a mesma operação, inclusive sob retries simultâneos.
 * A transação compara payload imutável antes de aceitar um replay.
 *
 * Não interpreta pagamentos de tentativas com IDs diferentes como duplicatas:
 * pagamentos parciais legítimos devem continuar possíveis.
 */
export async function writeInvoiceEventOnce(database, uid, event) {
  if (typeof uid !== 'string' || !uid.trim()) {
    throw new Error('Usuário autenticado obrigatório.')
  }

  const operation = prepareInvoiceEventOperation(event)
  const reference = doc(database, 'users', uid, 'invoiceEvents', operation.id)

  return runTransaction(database, async (transaction) => {
    const existing = await transaction.get(reference)

    if (existing.exists()) {
      if (!sameInvoiceOperation(existing.data(), operation.data)) {
        throw new Error(
          event.type === 'reversal'
            ? 'Este pagamento já possui um estorno registrado. Confira o histórico antes de tentar novamente.'
            : 'Este identificador já foi utilizado para um evento diferente.',
        )
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
