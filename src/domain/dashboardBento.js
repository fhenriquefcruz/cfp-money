import { getTransactionActivityDate } from './transactionDates'

// Etiquetas extraídas somente para visualização; não alteram titularidade no Firestore.
export function getDashboardTransactionTags(transaction = {}) {
  const description = String(transaction.description || '')
  const tags = []
  if (/cart[aã]o\s+m[aã]e\b/i.test(description)) tags.push('Cartão Mãe')
  const cardMatch = description.match(/cart[aã]o\s+(\d{4})\b/i)
  if (cardMatch) tags.push(`Cartão ${cardMatch[1]}`)
  return tags
}

export function isDashboardThirdParty(transaction = {}) {
  const explicit =
    transaction.isThirdParty === true ||
    transaction.isReimbursable === true ||
    transaction.expenseOwner === 'third_party'
  return explicit || getDashboardTransactionTags(transaction).includes('Cartão Mãe')
}

export function filterDashboardFeed(transactions = [], filter = 'all', ownOnly = false) {
  return transactions.filter((transaction) => {
    if (ownOnly && isDashboardThirdParty(transaction)) return false
    if (filter === 'own') return !isDashboardThirdParty(transaction)
    if (filter === 'third-party') return isDashboardThirdParty(transaction)
    if (filter === 'card-5186') {
      return (
        getDashboardTransactionTags(transaction).includes('Cartão 5186') ||
        String(transaction.cardLast4 || '') === '5186'
      )
    }
    if (filter === 'recurring') {
      return Boolean(
        transaction.isRecurring ||
          transaction.recurring ||
          transaction.recurringId ||
          transaction.recurrence,
      )
    }
    return true
  })
}

export function groupDashboardFeedByDate(transactions = []) {
  const groups = new Map()
  for (const transaction of transactions) {
    const date = getTransactionActivityDate(transaction)
    const key = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : 'unknown'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(transaction)
  }
  return [...groups].map(([date, items]) => ({ date, items }))
}
