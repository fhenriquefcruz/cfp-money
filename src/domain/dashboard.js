import { endOfMonth, format, startOfMonth } from 'date-fns'
import { getTransactionActivityDate } from './transactionDates'

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
      const activityDate = getTransactionActivityDate(transaction)
      return (
        transaction?.paymentStatus !== 'cancelled' &&
        transaction?.flowType !== 'transfer' &&
        transaction?.kind !== 'transfer' &&
        !transaction?.isSavings &&
        activityDate >= bounds.start &&
        activityDate <= bounds.end
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

export function buildCategoryBreakdown(current = [], previous = []) {
  const previousByCategory = new Map(
    previous.map((item) => [item.categoryId || item.categoryName, Number(item.total) || 0]),
  )
  const total = current.reduce((sum, item) => sum + (Number(item.total) || 0), 0)

  return current
    .map((item) => {
      const amount = Number(item.total) || 0
      const previousAmount = previousByCategory.get(item.categoryId || item.categoryName) || 0
      return {
        ...item,
        total: amount,
        sharePercent: total > 0 ? (amount / total) * 100 : 0,
        changePercent:
          previousAmount > 0 ? ((amount - previousAmount) / previousAmount) * 100 : null,
      }
    })
    .sort((first, second) => second.total - first.total)
}

export function getLargestMonthlyExpenseChange(monthlyData = []) {
  let result = null

  for (let index = 1; index < monthlyData.length; index += 1) {
    const previous = monthlyData[index - 1]
    const current = monthlyData[index]
    const delta = (Number(current.expenses) || 0) - (Number(previous.expenses) || 0)

    if (!result || Math.abs(delta) > Math.abs(result.delta)) {
      result = {
        month: current.fullMonth || current.month,
        monthKey: current.monthKey,
        previousMonth: previous.fullMonth || previous.month,
        delta,
        percent: Number(previous.expenses) > 0 ? (delta / Number(previous.expenses)) * 100 : null,
      }
    }
  }

  return result
}

export function buildPeriodResultInsight(current = {}, previous = {}) {
  const income = Number(current.income) || 0
  const expenses = Number(current.expenses) || 0
  const balance = Number(current.balance) || 0
  const previousIncome = Number(previous.income) || 0
  const previousExpenses = Number(previous.expenses) || 0
  const previousBalance = Number(previous.balance) || 0
  const hasPreviousActivity =
    Number(previous.count || 0) > 0 || previousIncome > 0 || previousExpenses > 0

  const expenseIncomeRatio = income > 0 ? Math.round((expenses / income) * 100) : null
  const retainedIncomeRatio =
    income > 0 && balance > 0 ? Math.round((balance / income) * 100) : null
  const comparisonDelta = hasPreviousActivity ? balance - previousBalance : null

  const tone = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral'
  const comparisonTone =
    comparisonDelta === null || comparisonDelta === 0
      ? 'neutral'
      : comparisonDelta > 0
        ? 'positive'
        : 'negative'

  const statusLabel =
    tone === 'positive'
      ? 'Período no azul'
      : tone === 'negative'
        ? 'Fluxo pressionado'
        : 'Período equilibrado'

  const story =
    tone === 'positive' && retainedIncomeRatio !== null
      ? `Resultado positivo equivalente a ${retainedIncomeRatio}% das receitas do período.`
      : tone === 'negative'
        ? 'As despesas superaram as receitas no período visualizado.'
        : income > 0 || expenses > 0
          ? 'Receitas e despesas ficaram equilibradas no período.'
          : 'Registre receitas e despesas para construir a leitura do período.'

  return {
    tone,
    statusLabel,
    expenseIncomeRatio,
    retainedIncomeRatio,
    comparisonDelta,
    comparisonTone,
    story,
  }
}

export function buildDashboardActionInsights({
  currentSummary = {},
  previousSummary = {},
  categoryBreakdown = [],
  paymentSummary = {},
  savingsOverview = {},
  budgetMonthKey = '',
} = {}) {
  const insights = []
  const balance = Number(currentSummary.balance) || 0
  const previousBalance = Number(previousSummary.balance) || 0
  const hasPrevious =
    Number(previousSummary.count || previousSummary.income || previousSummary.expenses || 0) > 0

  if (hasPrevious && balance !== previousBalance) {
    const delta = balance - previousBalance
    insights.push({
      title: delta > 0 ? 'Resultado melhorou' : 'Resultado perdeu força',
      amount: Math.abs(delta),
      detail: delta > 0 ? 'Melhora frente ao mês anterior.' : 'Queda frente ao mês anterior.',
      to: '/transactions',
      actionLabel: 'Entender movimentações',
    })
  }

  const category = categoryBreakdown[0]
  if (Number(category?.total || 0) > 0) {
    const share = Number(category.sharePercent || 0)
    const change = category.changePercent
    insights.push({
      title: `${category.categoryName} lidera os gastos`,
      amount: Number(category.total),
      detail:
        change === null
          ? `${share.toFixed(0)}% das despesas categorizadas.`
          : `${share.toFixed(0)}% das despesas · ${Number(change) >= 0 ? '+' : ''}${Number(change).toFixed(0)}% vs. mês anterior.`,
      to: `/transactions?category=${encodeURIComponent(category.categoryId || '')}`,
      actionLabel: 'Ver lançamentos',
    })
  }

  const overdue = Number(paymentSummary.overdueCount || 0)
  const dueSoon = Number(paymentSummary.dueNext7DaysCount || 0)
  if (overdue || dueSoon) {
    const isOverdue = overdue > 0
    insights.push({
      title: `${isOverdue ? overdue : dueSoon} ${
        isOverdue
          ? overdue === 1
            ? 'pagamento atrasado'
            : 'pagamentos atrasados'
          : dueSoon === 1
            ? 'vencimento próximo'
            : 'vencimentos próximos'
      }`,
      amount: Number(
        isOverdue ? paymentSummary.overdueAmount || 0 : paymentSummary.dueNext7DaysAmount || 0,
      ),
      detail: isOverdue
        ? 'Regularize para reduzir a pressão no mês.'
        : 'Antecipe para proteger o resultado.',
      to: '/transactions',
      actionLabel: isOverdue ? 'Regularizar' : 'Ver vencimentos',
    })
  } else if (Number(savingsOverview.totalBalance || 0) > 0) {
    insights.push({
      title: 'Reservas como proteção',
      amount: Number(savingsOverview.totalBalance),
      detail:
        Number(savingsOverview.periodNet || 0) >= 0
          ? 'O patrimônio reservado não recuou neste período.'
          : 'Houve retirada líquida das reservas neste período.',
      to: '/savings',
      actionLabel: 'Abrir reservas',
    })
  } else if (budgetMonthKey) {
    insights.push({
      title: 'Planejamento do mês',
      amount: null,
      detail: 'Acompanhe os limites para proteger o resultado.',
      to: `/budgets?month=${budgetMonthKey}`,
      actionLabel: 'Abrir orçamento',
    })
  }

  return insights.slice(0, 3)
}
