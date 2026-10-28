// Diagnóstico local somente de leitura: não altera transações ou cartões.
const isCreditExpense = (transaction) =>
  transaction.type === 'expense' &&
  !transaction.isSavings &&
  transaction.paymentStatus !== 'cancelled' &&
  (transaction.cardId ||
    transaction.paymentMethod === 'credit_card' ||
    transaction.isCreditPurchase === true)

export function auditCardLinkage({ transactions = [], creditCards = [] } = {}) {
  const registeredIds = new Set(creditCards.map((card) => card.id))
  const counts = { linked: 0, historical: 0, unlinked: 0 }

  for (const transaction of transactions) {
    if (!isCreditExpense(transaction)) continue
    if (transaction.cardId) {
      counts.linked += 1
      if (!registeredIds.has(transaction.cardId)) counts.historical += 1
    } else {
      counts.unlinked += 1
    }
  }

  return counts
}
