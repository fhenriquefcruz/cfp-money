import { invoiceEventToCents } from './invoiceEventIdempotency.js'

// O histórico consultado no servidor inclui os estornos legados.
export function validateInvoiceReversalBalance(payment, event, historicalEvents = []) {
  if (!payment?.id || payment.type !== 'payment') {
    throw new Error('Pagamento de origem não encontrado para estorno.')
  }
  if (payment.invoiceKey !== event.invoiceKey || event.reversesEventId !== payment.id) {
    throw new Error('Estorno não pertence ao mesmo pagamento e fatura.')
  }

  const originalCents = invoiceEventToCents(payment.amount)
  const requestedCents = invoiceEventToCents(event.amount)
  let previouslyReversedCents = 0
  for (const item of historicalEvents) {
    if (item.type === 'reversal' && item.reversesEventId === payment.id) {
      previouslyReversedCents += invoiceEventToCents(item.amount)
    }
  }

  if (
    requestedCents <= 0 ||
    !Number.isSafeInteger(previouslyReversedCents) ||
    requestedCents + previouslyReversedCents > originalCents
  ) {
    throw new Error('A soma de estornos ultrapassaria o pagamento original.')
  }
  return { requestedCents, originalCents, previouslyReversedCents }
}
