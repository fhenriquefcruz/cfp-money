// Regra canônica de elegibilidade compartilhada pelos diagnósticos.
export const isCreditExpense = (tx) =>
  tx?.type === 'expense' &&
  !tx.isSavings &&
  tx.paymentStatus !== 'cancelled' &&
  (tx.paymentMethod === 'credit_card' || tx.isCreditPurchase === true || !!tx.cardId)

// Resumo enxuto para a tela de cartões: leitura somente, sem Firebase.
export function summarizeCardLinks({ transactions = [], creditCards = [] } = {}) {
  const ids = new Set(creditCards.map((card) => card?.id))
  let saved = 0
  let unlinked = 0
  let historical = 0

  for (const tx of transactions) {
    if (!isCreditExpense(tx)) continue
    if (!tx.cardId) unlinked += 1
    else {
      saved += 1
      if (!ids.has(tx.cardId)) historical += 1
    }
  }
  return { saved, unlinked, historical }
}
