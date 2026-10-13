import { getGoalEffectiveCurrent, getSavingsSignedAmount } from './savings'

const movementDate = (item = {}) =>
  item.purchaseDate || item.originalPurchaseDate || item.date || item.dueDate || ''

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const monthAt = (now, offset) => new Date(now.getFullYear(), now.getMonth() + offset, 1)

export function buildSavingsInsights(transactions = [], goals = [], now = new Date()) {
  const movements = transactions
    .map((transaction) => ({
      transaction,
      amount: getSavingsSignedAmount(transaction),
      date: movementDate(transaction),
    }))
    .filter((item) => item.amount && item.date)

  const groupedInstitutions = new Map()
  movements.forEach(({ transaction, amount }) => {
    const institution =
      String(transaction.savingsInstitution || '').trim() || 'Instituição não informada'
    const current = groupedInstitutions.get(institution) || { institution, balance: 0 }
    current.balance += amount
    groupedInstitutions.set(institution, current)
  })

  const institutions = [...groupedInstitutions.values()]
    .map((item) => ({
      institution: item.institution,
      balance: Math.max(0, item.balance),
    }))
    .filter((item) => item.balance > 0)
    .sort((a, b) => b.balance - a.balance)

  const history = Array.from({ length: 6 }, (_, index) => {
    const date = monthAt(now, index - 5)
    const key = monthKey(date)
    return {
      monthKey: key,
      label: `${new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')}/${String(date.getFullYear()).slice(-2)}`,
      balance: Math.max(
        0,
        movements.reduce((sum, item) => sum + (item.date.slice(0, 7) <= key ? item.amount : 0), 0),
      ),
    }
  })

  const recentStart = monthKey(monthAt(now, -2))
  const today = `${monthKey(now)}-${String(now.getDate()).padStart(2, '0')}`

  const projections = goals
    .map((goal) => {
      const current = getGoalEffectiveCurrent(goal, transactions)
      const target = Math.max(0, Number(goal.targetAmount) || 0)
      const remaining = Math.max(0, target - current)
      const recentNet = movements.reduce(
        (sum, item) =>
          item.transaction.goalId === goal.id &&
          item.date.slice(0, 7) >= recentStart &&
          item.date <= today
            ? sum + item.amount
            : sum,
        0,
      )
      const monthlyPace = Math.max(0, recentNet / 3)
      const projectedMonths =
        remaining > 0 && monthlyPace > 0 ? Math.ceil(remaining / monthlyPace) : null
      return {
        goalId: goal.id,
        name: goal.name,
        emoji: goal.emoji || '🎯',
        remaining,
        monthlyPace,
        projectedMonths,
      }
    })
    .filter((item) => item.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 4)

  return { institutions, history, projections }
}
