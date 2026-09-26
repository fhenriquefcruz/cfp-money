import { endOfMonth, format, startOfMonth } from 'date-fns'
import { getTransactionAccountingDate, getTransactionActivityDate } from './transactionDates'

export function getCalendarMonthBounds(referenceDate = new Date()) {
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)

  if (Number.isNaN(date.getTime())) {
    throw new Error('Data de referência inválida.')
  }

  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  }
}

export function getRecentDashboardTransactions(transactions = [], bounds, limit = 6) {
  if (!bounds?.start || !bounds?.end || limit <= 0) return []

  return transactions
    .filter((transaction) => {
      const accountingDate = getTransactionAccountingDate(transaction)
      return (
        !transaction?.isSavings && accountingDate >= bounds.start && accountingDate <= bounds.end
      )
    })
    .sort((a, b) => {
      const activityDifference = getTransactionActivityDate(b).localeCompare(
        getTransactionActivityDate(a),
      )

      if (activityDifference !== 0) return activityDifference
      return String(b.id || '').localeCompare(String(a.id || ''))
    })
    .slice(0, limit)
}

export function buildMonthAttentionSignals({
  paymentSummary = {},
  budgetAlerts = [],
  balance = 0,
  limit = 3,
} = {}) {
  const safeLimit = Math.max(0, Number(limit) || 0)
  if (safeLimit === 0) return []

  const signals = []

  if (Number(paymentSummary.overdueCount || 0) > 0) {
    signals.push({
      type: 'overdue',
      count: Number(paymentSummary.overdueCount || 0),
      amount: Number(paymentSummary.overdueAmount || 0),
    })
  }

  if (Number(paymentSummary.dueNext7DaysCount || 0) > 0) {
    signals.push({
      type: 'due-soon',
      count: Number(paymentSummary.dueNext7DaysCount || 0),
      amount: Number(paymentSummary.dueNext7DaysAmount || 0),
    })
  }

  const budgetAttention = budgetAlerts[0]
  if (budgetAttention) {
    const amount = Number(budgetAttention.budget?.amount || 0)
    const spent = Number(budgetAttention.spent || 0)
    const pct = Number(budgetAttention.pct || 0)

    signals.push({
      type: 'budget',
      budgetId: budgetAttention.budget?.id || budgetAttention.budget?.categoryId || 'budget',
      categoryName: budgetAttention.cat?.name || 'Orçamento',
      spent,
      limit: amount,
      pct,
      excess: Math.max(0, spent - amount),
      isOver: amount > 0 && spent > amount,
    })
  }

  if (signals.length < safeLimit && Number(balance || 0) < 0) {
    signals.push({
      type: 'negative-balance',
      amount: Math.abs(Number(balance || 0)),
    })
  }

  return signals.slice(0, safeLimit)
}
