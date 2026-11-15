import { addMoneyCents, fromMoneyCents, toMoneyCents } from './moneyCents'

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

export function getSavingsSignedCents(transaction = {}) {
  if (!transaction.isSavings || !isEffective(transaction)) return 0
  const cents = Math.abs(toMoneyCents(transaction.amount))
  return transaction.savingsMovement === SAVINGS_WITHDRAWAL ? -cents : cents
}

export function getSavingsSignedAmount(transaction = {}) {
  return fromMoneyCents(getSavingsSignedCents(transaction))
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

  const cents = transactions.reduce((total, transaction) => {
    if (transaction.goalId !== goalId) return total
    return addMoneyCents(total, getSavingsSignedCents(transaction))
  }, 0)
  return fromMoneyCents(cents)
}

export function getGoalEffectiveCurrent(goal = {}, transactions = []) {
  const openingCents = toMoneyCents(goal.currentAmount)
  const movementCents = toMoneyCents(getGoalSavingsAmount(transactions, goal.id))
  return fromMoneyCents(Math.max(0, addMoneyCents(openingCents, movementCents)))
}

export function buildSavingsOverview(transactions = [], bounds = {}) {
  const destinations = new Map()
  let totalCents = 0
  let depositCents = 0
  let withdrawalCents = 0

  transactions.forEach((transaction) => {
    const signedCents = getSavingsSignedCents(transaction)
    if (!signedCents) return

    totalCents = addMoneyCents(totalCents, signedCents)

    const label = getSavingsDestinationLabel(transaction)
    const current = destinations.get(label) || {
      label,
      destination:
        String(transaction.savingsDestination || '').trim() || UNCLASSIFIED_SAVINGS_DESTINATION,
      institution: String(transaction.savingsInstitution || '').trim(),
      balanceCents: 0,
      goalIds: new Set(),
    }
    current.balanceCents = addMoneyCents(current.balanceCents, signedCents)
    if (transaction.goalId) current.goalIds.add(transaction.goalId)
    destinations.set(label, current)

    const date = activityDate(transaction)
    const insidePeriod =
      (!bounds.start || date >= bounds.start) && (!bounds.end || date <= bounds.end)

    if (!insidePeriod) return
    if (signedCents > 0) depositCents = addMoneyCents(depositCents, signedCents)
    else withdrawalCents = addMoneyCents(withdrawalCents, Math.abs(signedCents))
  })

  return {
    totalBalance: fromMoneyCents(totalCents),
    periodDeposits: fromMoneyCents(depositCents),
    periodWithdrawals: fromMoneyCents(withdrawalCents),
    periodNet: fromMoneyCents(addMoneyCents(depositCents, -withdrawalCents)),
    destinations: [...destinations.values()]
      .map(({ balanceCents, ...item }) => ({
        ...item,
        balance: fromMoneyCents(Math.max(0, balanceCents)),
        goalIds: [...item.goalIds],
      }))
      .filter((item) => item.balance > 0)
      .sort((first, second) => second.balance - first.balance),
  }
}
