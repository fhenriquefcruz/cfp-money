import { getSavingsDestinationLabel, getSavingsSignedAmount } from './savings'

export const SAVINGS_HISTORY_PAGE_SIZE = 12

export const savingsMovementDate = (transaction = {}) =>
  transaction.purchaseDate ||
  transaction.originalPurchaseDate ||
  transaction.date ||
  transaction.dueDate ||
  ''

export function getSavingsHistoryDestinations(transactions = []) {
  return [
    ...new Set(
      transactions
        .filter((transaction) => getSavingsSignedAmount(transaction) !== 0)
        .map(getSavingsDestinationLabel),
    ),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function buildSavingsHistory(
  transactions = [],
  { type = 'all', destination = 'all', search = '', attachmentsOnly = false, limit = 12 } = {},
) {
  const query = String(search).trim().toLocaleLowerCase('pt-BR')
  const matches = transactions
    .filter((movement) => {
      const amount = getSavingsSignedAmount(movement)
      if (amount === 0) return false
      if (type === 'deposit' && amount < 0) return false
      if (type === 'withdrawal' && amount > 0) return false
      if (destination !== 'all' && getSavingsDestinationLabel(movement) !== destination) {
        return false
      }
      if (
        attachmentsOnly &&
        !(Array.isArray(movement.attachments) && movement.attachments.length > 0)
      ) {
        return false
      }
      if (!query) return true
      const haystack = [
        movement.description,
        movement.savingsDestination,
        movement.savingsInstitution,
        getSavingsDestinationLabel(movement),
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
      return haystack.includes(query)
    })
    .sort(
      (a, b) =>
        savingsMovementDate(b).localeCompare(savingsMovementDate(a)) ||
        String(b.createdAt || '').localeCompare(String(a.createdAt || '')) ||
        String(b.id || '').localeCompare(String(a.id || '')),
    )

  const visible = matches.slice(0, Math.max(0, limit))
  const groups = []
  for (const movement of visible) {
    const date = savingsMovementDate(movement)
    const month = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : ''
    const last = groups[groups.length - 1]
    if (last && last.month === month) last.movements.push(movement)
    else groups.push({ month, movements: [movement] })
  }

  return { groups, total: matches.length, shown: visible.length }
}
