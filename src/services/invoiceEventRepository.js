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
  const isReversal = operation.data.type === 'reversal'
  const originalPaymentId = operation.data.reversesEventId

  // A leitura obrigatoriamente vai ao servidor para reconhecer estornos legados.
  // Após a ativação das novas Rules, não podem surgir eventos novos sem trava.
  const priorReversals = isReversal
    ? await getDocs(
        query(
          collection(database, 'users', uid, 'invoiceEvents'),
          where('reversesEventId', '==', originalPaymentId),
        ),
      )
    : null
  if (priorReversals?.metadata?.fromCache) {
    throw new Error('Histórico de estornos indisponível no servidor. Tente novamente online.')
  }
  const historicalEvents = priorReversals
    ? priorReversals.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
    : []

  const paymentRef = isReversal
    ? doc(database, 'users', uid, 'invoiceEvents', originalPaymentId)
    : null
  const guardRef = isReversal
    ? doc(database, 'users', uid, 'invoiceReversalLocks', originalPaymentId)
    : null

  return runTransaction(database, async (transaction) => {
    const existing = await transaction.get(reference)
    if (existing.exists()) {
      if (!sameInvoiceOperation(existing.data(), operation.data)) {
        throw new Error('Este identificador já foi utilizado para um evento diferente.')
      }
      return { id: reference.id, replayed: true }
    }

    let reversalValidation = null
    if (isReversal) {
      // Todas as leituras precedem as escritas; concorrentes disputam a mesma
      // trava por pagamento, inclusive usando IDs de operação diferentes.
      const paymentSnapshot = await transaction.get(paymentRef)
      const lockSnapshot = await transaction.get(guardRef)
      if (lockSnapshot.exists()) {
        throw new Error('Este pagamento já teve um estorno registrado. Revise o histórico.')
      }
      reversalValidation = validateInvoiceReversalBalance(
        paymentSnapshot.exists()
          ? { ...paymentSnapshot.data(), id: paymentSnapshot.id }
          : null,
        operation.data,
        historicalEvents,
      )
    }

    transaction.set(reference, {
      ...operation.data,
      createdAt: serverTimestamp(),
    })

    if (isReversal) {
      transaction.set(guardRef, {
        paymentId: originalPaymentId,
        reversalEventId: reference.id,
        invoiceKey: operation.data.invoiceKey,
        amountCents: reversalValidation.requestedCents,
        createdAt: serverTimestamp(),
      })
    }

    return { id: reference.id, replayed: false }
  })
}
