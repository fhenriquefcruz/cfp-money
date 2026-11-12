import { isUnlinkedCreditPurchase } from './cardReconciliation'
import { isCreditExpense } from './cardLinkageSummary'

// Leitura pura: grupos exclusivos por cartão, sem inferência e sem escrita.
export function auditCreditCardIntegrity({ transactions = [], creditCards = [] } = {}) {
  const ids = new Set(creditCards.map((card) => card?.id).filter(Boolean))
  const counts = [0, 0, 0] // cadastrado, sem vínculo, histórico
  const totals = [0, 0, 0]
  const exceptions = { unlinked: [], missingCard: [], invalidMonth: [] }
  let reconcilableCount = 0
  let invalidMonthCount = 0
  let reversibleCount = 0

  for (const tx of transactions) {
    if (!isCreditExpense(tx)) continue

    const group = !tx.cardId ? 1 : ids.has(tx.cardId) ? 0 : 2
    const amount = Number(tx.amount ?? 0)
    counts[group] += 1
    totals[group] += Number.isFinite(amount) ? Math.round(amount * 100) : 0

    if (group === 1) {
      if (tx.id) exceptions.unlinked.push(tx.id)
      if (isUnlinkedCreditPurchase(tx)) reconcilableCount += 1
    } else if (group === 2 && tx.id) exceptions.missingCard.push(tx.id)

    if (tx.invoiceMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(tx.invoiceMonth)) {
      invalidMonthCount += 1
      if (tx.id) exceptions.invalidMonth.push(tx.id)
    }
    if (tx.cardReconciliation?.version === 1) reversibleCount += 1
  }

  return {
    totalPurchases: counts[0] + counts[1] + counts[2],
    purchaseTotal: (totals[0] + totals[1] + totals[2]) / 100,
    linkedCount: counts[0],
    linkedTotal: totals[0] / 100,
    unlinkedCount: counts[1],
    unlinkedTotal: totals[1] / 100,
    historicalCount: counts[2],
    historicalTotal: totals[2] / 100,
    savedLinkCount: counts[0] + counts[2],
    orphanedCardCount: counts[2],
    orphanedCardTotal: totals[2] / 100,
    reconcilableCount,
    invalidMonthCount,
    reversibleCount,
    exceptions,
  }
}

/**
 * Detecta lacunas em séries já gravadas sem reconstruir ou alterar movimentos.
 * Não é possível inferir parcelas de uma série sem pelo menos um documento.
 */
export function findIncompleteCardInstallmentGroups(transactions = []) {
  const groups = new Map()

  transactions.forEach((transaction) => {
    const count = Number(transaction.installmentOf)
    const position = Number(transaction.installmentNum)
    if (
      !transaction.isInstallment ||
      !transaction.installmentGroupId ||
      !transaction.cardId ||
      !Number.isInteger(count) ||
      count < 2 ||
      count > 48
    ) {
      return
    }

    const key = `${transaction.cardId}:${transaction.installmentGroupId}`
    const group = groups.get(key) || {
      id: transaction.installmentGroupId,
      cardId: transaction.cardId,
      description: transaction.description || 'Compra parcelada',
      expected: count,
      positions: [],
      inconsistent: false,
    }
    if (count !== group.expected || !Number.isInteger(position) || position < 1 || position > count) {
      group.inconsistent = true
    } else {
      group.positions.push(position)
    }
    groups.set(key, group)
  })

  return [...groups.values()]
    .map((group) => {
      const unique = new Set(group.positions)
      const missing = Array.from(
        { length: group.expected },
        (_, index) => index + 1,
      ).filter((position) => !unique.has(position))
      return {
        id: group.id,
        cardId: group.cardId,
        description: group.description,
        expected: group.expected,
        found: unique.size,
        missing,
        inconsistent: group.inconsistent || unique.size !== group.positions.length,
      }
    })
    .filter((group) => group.missing.length || group.inconsistent)
}
