// Diagnóstico local somente de leitura: não altera transações ou cartões.
export function auditCardLinkage({ transactions = [], creditCards = [] } = {}) {
  const registeredIds = new Set(creditCards.map((card) => card.id))
  const counts = { linked: 0, historical: 0, unlinked: 0 }

  for (const transaction of transactions) {
    if (
      transaction.type !== 'expense' ||
      transaction.isSavings ||
      transaction.paymentStatus === 'cancelled'
    ) {
      continue
    }

    if (transaction.cardId) {
      counts.linked += 1
      if (!registeredIds.has(transaction.cardId)) counts.historical += 1
    } else if (
      transaction.paymentMethod === 'credit_card' ||
      transaction.isCreditPurchase === true
    ) {
      counts.unlinked += 1
    }
  }

  return counts
}
