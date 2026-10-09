const asAmount = (value) => (Number.isFinite(Number(value)) ? Math.abs(Number(value)) : 0)

const isEffective = (transaction = {}) =>
  transaction.paymentStatus !== 'cancelled' &&
  transaction.flowType !== 'transfer' &&
  transaction.kind !== 'transfer'

const activityDate = (transaction = {}) =>
  transaction.purchaseDate ||
  transaction.originalPurchaseDate ||
  transaction.date ||
  transaction.dueDate ||
  ''

export const SAVINGS_DEPOSIT = 'deposit'
export const SAVINGS_WITHDRAWAL = 'withdrawal'
export const UNCLASSIFIED_SAVINGS_DESTINATION = 'Reserva não classificada'

export function getSavingsSignedAmount(transaction = {}) {
  if (!transaction.isSavings || !isEffective(transaction)) return 0
  const amount = asAmount(transaction.amount)
  return transaction.savingsMovement === SAVINGS_WITHDRAWAL ? -amount : amount
}

export function getSavingsDestinationLabel(transaction = {}) {
  const destination =
    String(transaction.savingsDestination || '').trim() || UNCLASSIFIED_SAVINGS_DESTINATION
  const institution = String(transaction.savingsInstitution || '').trim()

  return institution ? `${institution} · ${destination}` : destination
}

export function getGoalSavingsAmount(transactions = [], goalId = '') {
  if (!goalId) return 0

  return transactions.reduce((total, transaction) => {
    if (transaction.goalId !== goalId) return total
    return total + getSavingsSignedAmount(transaction)
  }, 0)
}

export function getGoalEffectiveCurrent(goal = {}, transactions = []) {
  const openingBalance = Number(goal.currentAmount) || 0
  return Math.max(0, openingBalance + getGoalSavingsAmount(transactions, goal.id))
}

export function buildSavingsOverview(transactions = [], bounds = {}) {
  const destinations = new Map()
  let totalBalance = 0
  let periodDeposits = 0
  let periodWithdrawals = 0

  transactions.forEach((transaction) => {
    const signedAmount = getSavingsSignedAmount(transaction)
    if (!signedAmount) return

    totalBalance += signedAmount

    const label = getSavingsDestinationLabel(transaction)
    const current = destinations.get(label) || {
      label,
      destination:
        String(transaction.savingsDestination || '').trim() || UNCLASSIFIED_SAVINGS_DESTINATION,
      institution: String(transaction.savingsInstitution || '').trim(),
      balance: 0,
      goalIds: new Set(),
    }
    current.balance += signedAmount
    if (transaction.goalId) current.goalIds.add(transaction.goalId)
    destinations.set(label, current)

    const date = activityDate(transaction)
    const insidePeriod =
      (!bounds.start || date >= bounds.start) && (!bounds.end || date <= bounds.end)

    if (!insidePeriod) return
    if (signedAmount > 0) periodDeposits += signedAmount
    else periodWithdrawals += Math.abs(signedAmount)
  })

  return {
    totalBalance,
    periodDeposits,
    periodWithdrawals,
    periodNet: periodDeposits - periodWithdrawals,
    destinations: [...destinations.values()]
      .map((item) => ({
        ...item,
        balance: Math.max(0, item.balance),
        goalIds: [...item.goalIds],
      }))
      .filter((item) => item.balance > 0)
      .sort((first, second) => second.balance - first.balance),
  }
}
