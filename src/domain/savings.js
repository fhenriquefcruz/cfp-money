import {
  centsToMoney,
  getFinancialActivityDate,
  getGoalEffectiveCents,
  getSavingsSignedCents,
} from './financialCore'

const activityDate = getFinancialActivityDate

export const SAVINGS_DEPOSIT = 'deposit'
export const SAVINGS_WITHDRAWAL = 'withdrawal'
export const UNCLASSIFIED_SAVINGS_DESTINATION = 'Reserva não classificada'

export function getSavingsSignedAmount(transaction = {}) {
  return centsToMoney(getSavingsSignedCents(transaction))
}

export function getSavingsDestinationLabel(transaction = {}) {
  const destination =
    String(transaction.savingsDestination || '').trim() || UNCLASSIFIED_SAVINGS_DESTINATION
  const institution = String(transaction.savingsInstitution || '').trim()

  return institution ? `${institution} · ${destination}` : destination
}

export function getUnclassifiedSavingsTransactions(transactions = []) {
  return transactions
    .filter(
      (transaction) =>
        transaction.isSavings &&
        getSavingsSignedAmount(transaction) !== 0 &&
        !String(transaction.savingsDestination || '').trim(),
    )
    .sort((first, second) => activityDate(second).localeCompare(activityDate(first)))
}

export function getGoalSavingsAmount(transactions = [], goalId = '') {
  if (!goalId) return 0

  return centsToMoney(
    transactions.reduce(
      (total, transaction) =>
        total + (transaction.goalId === goalId ? getSavingsSignedCents(transaction) : 0),
      0,
    ),
  )
}

export function getGoalEffectiveCurrent(goal = {}, transactions = []) {
  return centsToMoney(getGoalEffectiveCents(goal, transactions))
}

export function buildSavingsOverview(transactions = [], bounds = {}) {
  const destinations = new Map()
  let totalCents = 0
  let depositsCents = 0
  let withdrawalsCents = 0

  transactions.forEach((transaction) => {
    const signedCents = getSavingsSignedCents(transaction)
    if (!signedCents) return
    totalCents += signedCents

    const label = getSavingsDestinationLabel(transaction)
    const current = destinations.get(label) || {
      label,
      destination:
        String(transaction.savingsDestination || '').trim() || UNCLASSIFIED_SAVINGS_DESTINATION,
      institution: String(transaction.savingsInstitution || '').trim(),
      balanceCents: 0,
      goalIds: new Set(),
    }
    current.balanceCents += signedCents
    if (transaction.goalId) current.goalIds.add(transaction.goalId)
    destinations.set(label, current)

    const date = activityDate(transaction)
    const insidePeriod =
      (!bounds.start || date >= bounds.start) && (!bounds.end || date <= bounds.end)
    if (!insidePeriod) return
    if (signedCents > 0) depositsCents += signedCents
    else withdrawalsCents += Math.abs(signedCents)
  })

  return {
    totalBalance: centsToMoney(totalCents),
    periodDeposits: centsToMoney(depositsCents),
    periodWithdrawals: centsToMoney(withdrawalsCents),
    periodNet: centsToMoney(depositsCents - withdrawalsCents),
    destinations: [...destinations.values()]
      .map(({ balanceCents, ...item }) => ({
        ...item,
        balance: centsToMoney(Math.max(0, balanceCents)),
        goalIds: [...item.goalIds],
      }))
      .filter((item) => item.balance > 0)
      .sort((first, second) => second.balance - first.balance),
  }
}
