// Diagnóstico local somente de leitura: não altera transações ou cartões.
export function auditCardLinkage({ transactions = [], creditCards = [] } = {}) {
  const registeredIds = new Set(creditCards.map((card) => card.id))
  let linked = 0
  let historical = 0
  let unlinked = 0

  for (const transaction of transactions) {
    if (
      transaction.type !== 'expense' ||
      transaction.isSavings ||
      transaction.paymentStatus === 'cancelled'
    ) {
      continue
    }

    if (transaction.cardId) {
      linked += 1
      if (!registeredIds.has(transaction.cardId)) historical += 1
    } else if (
      transaction.paymentMethod === 'credit_card' ||
      transaction.isCreditPurchase === true
    ) {
      unlinked += 1
    }
  }

  return { linked, historical, unlinked }
}
