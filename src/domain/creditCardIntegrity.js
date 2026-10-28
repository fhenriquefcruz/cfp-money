import { isUnlinkedCreditPurchase } from './cardReconciliation'

const cents = (value) => Math.round(Number(value || 0) * 100)
const money = (items) => items.reduce((total, item) => total + cents(item.amount), 0) / 100
const credit = (tx) =>
  tx?.type === 'expense' &&
  !tx.isSavings &&
  tx.paymentStatus !== 'cancelled' &&
  (tx.paymentMethod === 'credit_card' || tx.isCreditPurchase === true || Boolean(tx.cardId))

// Auditoria somente leitura. Não calcula cartões por nome nem altera o mês da fatura.
export function auditCreditCardIntegrity({ transactions = [], creditCards = [] } = {}) {
  const cardIds = new Set(creditCards.map((card) => card.id).filter(Boolean))
  const purchases = transactions.filter(credit)
  const unlinked = purchases.filter(isUnlinkedCreditPurchase)
  const dangling = purchases.filter((tx) => tx.cardId && !cardIds.has(tx.cardId))
  const invalidMonth = purchases.filter(
    (tx) => tx.invoiceMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(tx.invoiceMonth),
  )
  const reconciled = purchases.filter((tx) => tx.cardReconciliation?.version === 1)
  const validLinked = purchases.filter((tx) => tx.cardId && cardIds.has(tx.cardId))
  return {
    totalPurchases: purchases.length,
    purchaseTotal: money(purchases),
    linkedCount: validLinked.length,
    linkedTotal: money(validLinked),
    unlinkedCount: unlinked.length,
    unlinkedTotal: money(unlinked),
    orphanedCardCount: dangling.length,
    orphanedCardTotal: money(dangling),
    invalidMonthCount: invalidMonth.length,
    reversibleCount: reconciled.length,
    exceptions: {
      unlinked: unlinked.map((tx) => tx.id).filter(Boolean),
      missingCard: dangling.map((tx) => tx.id).filter(Boolean),
      invalidMonth: invalidMonth.map((tx) => tx.id).filter(Boolean),
    },
  }
}
