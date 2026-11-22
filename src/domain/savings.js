const toSavingsCents = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 0
  const cents = Math.round(Math.abs(amount) * 100)
  return Number.isSafeInteger(cents) ? cents : 0
}

const toOpeningBalanceCents = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 0
  const cents = Math.round(amount * 100)
  return Number.isSafeInteger(cents) ? cents : 0
}

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

const getSavingsSignedCents = (transaction = {}) => {
  if (!transaction.isSavings || !isEffective(transaction)) return 0
  const cents = toSavingsCents(transaction.amount)
  return transaction.savingsMovement === SAVINGS_WITHDRAWAL ? -cents : cents
}

export function getSavingsSignedAmount(transaction = {}) {
  return getSavingsSignedCents(transaction) / 100
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

const getGoalSavingsCents = (transactions = [], goalId = '') => {
  if (!goalId) return 0
  return transactions.reduce(
    (total, transaction) =>
      transaction.goalId === goalId ? total + getSavingsSignedCents(transaction) : total,
    0,
  )
}

export function getGoalSavingsAmount(transactions = [], goalId = '') {
  return getGoalSavingsCents(transactions, goalId) / 100
}

export function getGoalEffectiveCurrent(goal = {}, transactions = []) {
  const openingBalanceCents = toOpeningBalanceCents(goal.currentAmount)
  return Math.max(0, openingBalanceCents + getGoalSavingsCents(transactions, goal.id)) / 100
}

export function buildSavingsOverview(transactions = [], bounds = {}) {
  const destinations = new Map()
  let totalBalanceCents = 0
  let periodDepositsCents = 0
  let periodWithdrawalsCents = 0

  transactions.forEach((transaction) => {
    const signedCents = getSavingsSignedCents(transaction)
    if (!signedCents) return

    totalBalanceCents += signedCents

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
    if (signedCents > 0) periodDepositsCents += signedCents
    else periodWithdrawalsCents += Math.abs(signedCents)
  })

  return {
    totalBalance: totalBalanceCents / 100,
    periodDeposits: periodDepositsCents / 100,
    periodWithdrawals: periodWithdrawalsCents / 100,
    periodNet: (periodDepositsCents - periodWithdrawalsCents) / 100,
    destinations: [...destinations.values()]
      .map(({ balanceCents, ...item }) => ({
        ...item,
        balance: Math.max(0, balanceCents) / 100,
        goalIds: [...item.goalIds],
      }))
      .filter((item) => item.balance > 0)
      .sort((first, second) => second.balance - first.balance),
  }
}
