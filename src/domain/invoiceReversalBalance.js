import { asCents } from './invoiceEventIdempotency.js'

/**
 * Estornos legados não são ignorados nem corrigidos automaticamente.
 * Esta validação trabalha apenas com centavos exatos e falha em histórico inconsistente.
 */
export function validateInvoiceReversalBalance({ payment, reversal, historicalReversals = [] }) {
  if (
    payment?.type !== 'payment' ||
    !payment.id ||
    payment.id !== reversal?.reversesEventId ||
    payment.invoiceKey !== reversal.invoiceKey ||
    payment.cardId !== reversal.cardId
  ) {
    throw new Error('Pagamento de origem incompatível com a fatura.')
  }

  const total = asCents(payment.amount)
  const requested = asCents(reversal.amount)
  if (total <= 0 || requested <= 0) throw new Error('Pagamento ou estorno inválido.')

  let reversed = 0
  for (const event of historicalReversals) {
    if (event.type !== 'reversal') throw new Error('Histórico de estornos inconsistente.')
    if (event.reversesEventId !== payment.id || event.invoiceKey !== payment.invoiceKey) {
      throw new Error('Histórico vinculado à fatura incorreta.')
    }
    const cents = asCents(event.amount)
    if (cents <= 0) throw new Error('Valor de estorno histórico inválido.')
    reversed += cents
  }

  if (!Number.isSafeInteger(reversed) || reversed > total) {
    throw new Error('Histórico estornado ultrapassa o pagamento original.')
  }
  const remaining = total - reversed
  if (!remaining) throw new Error('Pagamento já estornado integralmente.')
  if (requested > remaining) throw new Error('O estorno excede o saldo reversível.')
  return remaining
}
