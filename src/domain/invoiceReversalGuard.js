import { invoiceEventToCents } from './invoiceEventIdempotency.js'

/**
 * A reversão atual da interface é integral sobre o saldo reversível.
 * Operações registradas antes do bloqueio canônico entram no saldo inicial
 * apenas quando foram consultadas diretamente do servidor.
 */
export function validateInvoiceReversalBalance(payment, event, historicalEvents = []) {
  if (!payment || payment.type !== 'payment' || !payment.id) {
    throw new Error('Pagamento de origem não encontrado para estorno.')
  }
  if (
    payment.invoiceKey !== event.invoiceKey ||
    event.reversesEventId !== payment.id
  ) {
    throw new Error('Estorno não pertence ao mesmo pagamento e fatura.')
  }

  const originalCents = invoiceEventToCents(payment.amount)
  const requestedCents = invoiceEventToCents(event.amount)
  if (originalCents <= 0 || requestedCents <= 0) {
    throw new Error('O valor do estorno precisa ser positivo.')
  }

  let previouslyReversedCents = 0
  for (const previous of historicalEvents) {
    if (
      previous.type === 'reversal' &&
      previous.reversesEventId === payment.id
    ) {
      previouslyReversedCents += invoiceEventToCents(previous.amount)
      if (!Number.isSafeInteger(previouslyReversedCents)) {
        throw new Error('Histórico monetário de estornos inválido.')
      }
    }
  }

  if (previouslyReversedCents + requestedCents > originalCents) {
    throw new Error('A soma de estornos ultrapassaria o pagamento original.')
  }
  return { requestedCents, originalCents, previouslyReversedCents }
}
