import { isUnlinkedCreditPurchase } from './cardReconciliation'

// Regra canônica de elegibilidade compartilhada pelos diagnósticos.
export const isCreditExpense = (tx) =>
  tx?.type === 'expense' &&
  !tx.isSavings &&
  tx.paymentStatus !== 'cancelled' &&
  (tx.paymentMethod === 'credit_card' || tx.isCreditPurchase === true || !!tx.cardId)

// Resumo enxuto para a tela de cartões: leitura somente, sem Firebase.
export function summarizeCardLinks({ transactions = [], creditCards = [] } = {}) {
  const ids = new Set(creditCards.map((card) => card?.id))
  const result = { saved: 0, unlinked: 0, historical: 0, unlinkedPurchases: [], unlinkedTotal: 0 }

  for (const tx of transactions) {
    if (!isCreditExpense(tx)) continue
    if (!tx.cardId) {
      result.unlinked++
      if (isUnlinkedCreditPurchase(tx)) {
        result.unlinkedPurchases.push(tx)
        result.unlinkedTotal += Math.round(Number(tx.amount || 0) * 100)
      }
    } else {
      result.saved++
      if (!ids.has(tx.cardId)) result.historical++
    }
  }
  result.unlinkedTotal /= 100
  return result
}
