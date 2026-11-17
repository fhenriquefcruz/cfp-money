// Valida limites aritméticos de um estorno antes de qualquer escrita.
// A trava transacional e as Rules fornecem a proteção contra concorrência.
export function invoiceReversalCents(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Valor de pagamento ou estorno inválido.')
  }
  const cents = Math.round(value * 100)
  if (!Number.isSafeInteger(cents) || cents <= 0 || Math.abs(value - cents / 100) >= 1e-9) {
    throw new Error('Pagamento ou estorno precisa ter centavos exatos.')
  }
  return cents
}

export function validateReversalAgainstPayment(payment, reversal, previousEvents = []) {
  if (!payment?.id || payment.type !== 'payment') {
    throw new Error('Pagamento de origem inexistente ou inválido.')
  }
  if (
    reversal.type !== 'reversal' ||
    reversal.reversesEventId !== payment.id ||
    reversal.cardId !== payment.cardId ||
    reversal.invoiceMonth !== payment.invoiceMonth ||
    reversal.invoiceKey !== payment.invoiceKey
  ) {
    throw new Error('O estorno não corresponde ao cartão e à fatura do pagamento.')
  }

  const originalCents = invoiceReversalCents(payment.amount)
  const requestedCents = invoiceReversalCents(reversal.amount)
  let historicalCents = 0

  for (const previous of previousEvents) {
    if (previous.type !== 'reversal' || previous.reversesEventId !== payment.id) continue
    const cents = invoiceReversalCents(previous.amount)
    historicalCents += cents
    if (!Number.isSafeInteger(historicalCents)) {
      throw new Error('Histórico de estornos ultrapassa o limite de precisão.')
    }
  }

  if (requestedCents + historicalCents > originalCents) {
    throw new Error('O estorno ultrapassa o saldo reversível deste pagamento.')
  }

  return { originalCents, requestedCents, historicalCents }
}
