// Diagnóstico local somente de leitura: não altera transações ou cartões.
const toCents = (items) =>
  items.reduce((total, item) => total + Math.round(Number(item.amount || 0) * 100), 0)

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
  const registeredIds = new Set(creditCards.map((card) => card.id).filter(Boolean))
  const creditPurchases = transactions.filter(isCreditExpense)
  const linked = creditPurchases.filter((item) => item.cardId && registeredIds.has(item.cardId))
  const historical = creditPurchases.filter(
    (item) => item.cardId && !registeredIds.has(item.cardId),
  )
  const unlinked = creditPurchases.filter((item) => !item.cardId)
  const reconcilable = unlinked.filter((item) => item.paymentMethod === 'credit_card')
  const reviewPaymentMethod = unlinked.filter((item) => item.paymentMethod !== 'credit_card')

  return {
    creditPurchaseCount: creditPurchases.length,
    savedLinkCount: linked.length + historical.length,
    registeredLinkCount: linked.length,
    historicalLinkCount: historical.length,
    historicalAmount: toCents(historical) / 100,
    unlinkedCount: unlinked.length,
    unlinkedAmount: toCents(unlinked) / 100,
    reconcilableCount: reconcilable.length,
    reconcilableAmount: toCents(reconcilable) / 100,
    paymentMethodReviewCount: reviewPaymentMethod.length,
    paymentMethodReviewAmount: toCents(reviewPaymentMethod) / 100,
  }
}
