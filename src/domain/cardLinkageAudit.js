// Diagnóstico local somente de leitura: não altera transações ou cartões.
const isCreditExpense = (transaction) =>
  transaction.type === 'expense' &&
  !transaction.isSavings &&
  transaction.paymentStatus !== 'cancelled' &&
  Boolean(
    transaction.cardId ||
    transaction.paymentMethod === 'credit_card' ||
    transaction.isCreditPurchase === true,
  )

export function auditCardLinkage({ transactions = [], creditCards = [] } = {}) {
  const registeredIds = new Set(creditCards.map((card) => card.id))
  const creditPurchases = transactions.filter(isCreditExpense)
  const historical = creditPurchases.filter(
    (item) => item.cardId && !registeredIds.has(item.cardId),
  )
  const unlinked = creditPurchases.filter((item) => !item.cardId)
  const reviewPaymentMethod = unlinked.filter((item) => item.paymentMethod !== 'credit_card')

  return {
    linked: creditPurchases.length - unlinked.length,
    historical: historical.length,
    unlinked: unlinked.length,
    review: reviewPaymentMethod.length,
  }
}
