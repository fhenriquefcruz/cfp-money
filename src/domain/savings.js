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
export const UNCLASSIFIED_SAVINGS_INSTITUTION = 'Instituição não informada'

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


const padDatePart = (value) => String(value).padStart(2, '0')

const toDateKey = (date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`

const monthBoundsFromOffset = (now, offset) => {
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return {
    start,
    end,
    startKey: toDateKey(start),
    endKey: toDateKey(end),
    monthKey: `${start.getFullYear()}-${padDatePart(start.getMonth() + 1)}`,
    label: `${new Intl.DateTimeFormat('pt-BR', { month: 'short' })
      .format(start)
      .replace('.', '')}/${String(start.getFullYear()).slice(-2)}`,
  }
}

const parseDateKey = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const addMonthsClamped = (date, months) => {
  const sourceDay = date.getDate()
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(sourceDay, lastDay))
  return target
}

export function buildSavingsInstitutionOverview(transactions = []) {
  const institutions = new Map()

  transactions.forEach((transaction) => {
    const signedAmount = getSavingsSignedAmount(transaction)
    if (!signedAmount) return

    const institution =
      String(transaction.savingsInstitution || '').trim() || UNCLASSIFIED_SAVINGS_INSTITUTION
    const destination =
      String(transaction.savingsDestination || '').trim() || UNCLASSIFIED_SAVINGS_DESTINATION

    const current = institutions.get(institution) || {
      institution,
      balance: 0,
      deposits: 0,
      withdrawals: 0,
      destinations: new Set(),
    }

    current.balance += signedAmount
    if (signedAmount > 0) current.deposits += signedAmount
    else current.withdrawals += Math.abs(signedAmount)
    current.destinations.add(destination)
    institutions.set(institution, current)
  })

  const normalized = [...institutions.values()]
    .map((item) => ({
      institution: item.institution,
      balance: Math.max(0, item.balance),
      deposits: item.deposits,
      withdrawals: item.withdrawals,
      destinationCount: item.destinations.size,
    }))
    .filter((item) => item.balance > 0)
    .sort((first, second) => second.balance - first.balance)

  const totalBalance = normalized.reduce((sum, item) => sum + item.balance, 0)

  return normalized.map((item) => ({
    ...item,
    share: totalBalance > 0 ? (item.balance / totalBalance) * 100 : 0,
  }))
}

export function buildSavingsBalanceHistory(transactions = [], options = {}) {
  const requestedMonths = Number(options.months)
  const months = Number.isFinite(requestedMonths) ? Math.max(1, Math.round(requestedMonths)) : 6
  const now = options.now instanceof Date ? options.now : new Date()

  return Array.from({ length: months }, (_, index) => {
    const offset = index - (months - 1)
    const bounds = monthBoundsFromOffset(now, offset)

    let balance = 0
    let net = 0

    transactions.forEach((transaction) => {
      const signedAmount = getSavingsSignedAmount(transaction)
      if (!signedAmount) return

      const date = activityDate(transaction)
      if (!date) return

      if (date <= bounds.endKey) balance += signedAmount
      if (date >= bounds.startKey && date <= bounds.endKey) net += signedAmount
    })

    return {
      monthKey: bounds.monthKey,
      label: bounds.label,
      balance: Math.max(0, balance),
      net,
    }
  })
}

export function buildGoalSavingsProjections(goals = [], transactions = [], options = {}) {
  const requestedMonths = Number(options.months)
  const months = Number.isFinite(requestedMonths) ? Math.max(1, Math.round(requestedMonths)) : 3
  const now = options.now instanceof Date ? options.now : new Date()
  const firstMonth = monthBoundsFromOffset(now, -(months - 1))
  const endKey = toDateKey(now)

  const statusPriority = {
    behind: 0,
    'on-track': 1,
    'no-pace': 2,
    projected: 3,
    completed: 4,
  }

  return goals
    .map((goal) => {
      const target = Math.max(0, Number(goal.targetAmount) || 0)
      const current = getGoalEffectiveCurrent(goal, transactions)
      const remaining = Math.max(0, target - current)
      const completed = target > 0 && remaining === 0

      const recentNet = transactions.reduce((sum, transaction) => {
        if (transaction.goalId !== goal.id) return sum
        const date = activityDate(transaction)
        if (!date || date < firstMonth.startKey || date > endKey) return sum
        return sum + getSavingsSignedAmount(transaction)
      }, 0)

      const averageMonthlyContribution = Math.max(0, recentNet / months)
      const projectedMonths =
        completed || averageMonthlyContribution <= 0
          ? completed
            ? 0
            : null
          : Math.max(1, Math.ceil(remaining / averageMonthlyContribution))
      const projectedDate =
        projectedMonths === null
          ? null
          : toDateKey(addMonthsClamped(now, projectedMonths))

      const deadline = parseDateKey(goal.deadline)
      const projectionDate = parseDateKey(projectedDate)

      let status = 'projected'
      if (completed) status = 'completed'
      else if (!projectedDate) status = 'no-pace'
      else if (deadline && projectionDate && projectionDate > deadline) status = 'behind'
      else if (deadline) status = 'on-track'

      return {
        goalId: goal.id,
        name: goal.name,
        emoji: goal.emoji || '🎯',
        target,
        current,
        remaining,
        completed,
        averageMonthlyContribution,
        projectedMonths,
        projectedDate,
        deadline: goal.deadline || null,
        status,
        historyMonths: months,
      }
    })
    .sort((first, second) => {
      const statusDifference =
        (statusPriority[first.status] ?? 99) - (statusPriority[second.status] ?? 99)
      if (statusDifference !== 0) return statusDifference
      return second.remaining - first.remaining
    })
}
