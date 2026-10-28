import { isUnlinkedCreditPurchase } from './cardReconciliation'

const cents = (value) => {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0
}

const credit = (tx) =>
  tx?.type === 'expense' &&
  !tx.isSavings &&
  tx.paymentStatus !== 'cancelled' &&
  (tx.paymentMethod === 'credit_card' || tx.isCreditPurchase === true || Boolean(tx.cardId))

const validInvoiceMonth = (month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month)

// Diagnóstico puro e somente leitura: cada compra entra em exatamente um grupo.
// Cartões históricos mantêm seu vínculo original; nunca atribuímos cartão por nome.
export function auditCreditCardIntegrity({ transactions = [], creditCards = [] } = {}) {
  const cardIds = new Set(creditCards.map((card) => card?.id).filter(Boolean))
  const totals = {
    purchase: 0,
    linked: 0,
    unlinked: 0,
    historical: 0,
  }
  const counts = {
    purchases: 0,
    linked: 0,
    unlinked: 0,
    historical: 0,
    reconcilable: 0,
    invalidMonth: 0,
    reversible: 0,
  }
  const exceptions = { unlinked: [], missingCard: [], invalidMonth: [] }

  for (const tx of transactions) {
    if (!credit(tx)) continue

    const amount = cents(tx.amount)
    counts.purchases += 1
    totals.purchase += amount

    if (!tx.cardId) {
      counts.unlinked += 1
      totals.unlinked += amount
      if (tx.id) exceptions.unlinked.push(tx.id)
      // O diagnóstico inclui compras marcadas como crédito; a conciliação
      // assistida segue o critério mais restrito do domínio financeiro.
      if (isUnlinkedCreditPurchase(tx)) counts.reconcilable += 1
    } else if (cardIds.has(tx.cardId)) {
      counts.linked += 1
      totals.linked += amount
    } else {
      counts.historical += 1
      totals.historical += amount
      if (tx.id) exceptions.missingCard.push(tx.id)
    }

    if (tx.invoiceMonth && !validInvoiceMonth(tx.invoiceMonth)) {
      counts.invalidMonth += 1
      if (tx.id) exceptions.invalidMonth.push(tx.id)
    }
    if (tx.cardReconciliation?.version === 1) counts.reversible += 1
  }

  return {
    totalPurchases: counts.purchases,
    purchaseTotal: totals.purchase / 100,
    linkedCount: counts.linked,
    linkedTotal: totals.linked / 100,
    unlinkedCount: counts.unlinked,
    unlinkedTotal: totals.unlinked / 100,
    // Campos explícitos para evitar a ambiguidade: "salvos" inclui históricos.
    historicalCount: counts.historical,
    historicalTotal: totals.historical / 100,
    savedLinkCount: counts.linked + counts.historical,
    orphanedCardCount: counts.historical,
    orphanedCardTotal: totals.historical / 100,
    reconcilableCount: counts.reconcilable,
    invalidMonthCount: counts.invalidMonth,
    reversibleCount: counts.reversible,
    exceptions,
  }
}
