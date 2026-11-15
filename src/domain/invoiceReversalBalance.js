import { asCents } from './invoiceEventIdempotency.js'

/**
 * Valida o saldo de um pagamento a partir de estornos legados imutáveis.
 * Não corrige nem ignora registros históricos inconsistentes.
 *
 * O documento canônico do estorno novo é excluído pelo repositório:
 * sua existência é resolvida primeiro pela transação como replay/conflito.
 */
export function validateInvoiceReversalBalance({
  payment,
  reversal,
  historicalReversals = [],
}) {
  if (
    payment?.type !== 'payment' ||
    !payment.id ||
    payment.invoiceKey !== reversal?.invoiceKey ||
    payment.cardId !== reversal?.cardId ||
    payment.id !== reversal?.reversesEventId
  ) {
    throw new Error('Pagamento de origem incompatível com a fatura. Revise o histórico.')
  }

  const paymentCents = asCents(payment.amount)
  const reversalCents = asCents(reversal.amount)
  if (paymentCents <= 0 || reversalCents <= 0) {
    throw new Error('Pagamento ou estorno com valor inválido.')
  }

  let historicalCents = 0
  for (const item of historicalReversals) {
    if (item.type !== 'reversal') {
      throw new Error('Histórico de estornos inconsistente. Revise antes de continuar.')
    }
    if (item.reversesEventId !== payment.id || item.invoiceKey !== payment.invoiceKey) {
      throw new Error('Histórico de estornos vinculado à fatura incorreta.')
    }

    const cents = asCents(item.amount)
    if (cents <= 0) {
      throw new Error('Valor de estorno histórico inválido. Revise antes de continuar.')
    }

    historicalCents += cents
    if (!Number.isSafeInteger(historicalCents) || historicalCents > paymentCents) {
      throw new Error('Histórico estornado ultrapassa o pagamento original.')
    }
  }

  const remainingCents = paymentCents - historicalCents
  if (remainingCents <= 0) {
    throw new Error('Este pagamento já foi integralmente estornado.')
  }
  if (reversalCents > remainingCents) {
    throw new Error('O estorno excede o saldo reversível após os eventos históricos.')
  }

  return remainingCents
}

