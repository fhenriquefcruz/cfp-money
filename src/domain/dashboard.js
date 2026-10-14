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
  const currentIncome = Number(currentSummary.income) || 0
  const currentExpenses = Number(currentSummary.expenses) || 0
  const currentBalance = Number(currentSummary.balance) || 0
  const previousBalance = Number(previousSummary.balance) || 0
  const hasPreviousActivity =
    Number(previousSummary.count || 0) > 0 ||
    Number(previousSummary.income || 0) > 0 ||
    Number(previousSummary.expenses || 0) > 0

  if (hasPreviousActivity) {
    const delta = currentBalance - previousBalance

    if (delta !== 0) {
      insights.push({
        id: 'period-result-change',
        type: 'result',
        tone: delta > 0 ? 'positive' : 'negative',
        title: delta > 0 ? 'Resultado melhorou no período' : 'Resultado perdeu força no período',
        amount: Math.abs(delta),
        detail:
          delta > 0
            ? 'A diferença entre receitas e despesas ficou melhor que no mês anterior.'
            : 'A diferença entre receitas e despesas ficou pior que no mês anterior.',
        to: '/transactions',
        actionLabel: 'Entender movimentações',
      })
    }
  } else if (currentIncome > 0 || currentExpenses > 0) {
    insights.push({
      id: 'period-result-current',
      type: 'result',
      tone: currentBalance >= 0 ? 'positive' : 'negative',
      title: currentBalance >= 0 ? 'Período com resultado positivo' : 'Despesas acima das receitas',
      amount: Math.abs(currentBalance),
      detail:
        currentBalance >= 0
          ? 'O mês mantém sobra entre receitas e despesas registradas.'
          : 'O período exige atenção porque as saídas superam as entradas.',
      to: '/transactions',
      actionLabel: 'Revisar movimentações',
    })
  }

  const topCategory = categoryBreakdown[0]
  if (topCategory && Number(topCategory.total || 0) > 0) {
    const changePercent = topCategory.changePercent
    const sharePercent = Number(topCategory.sharePercent || 0)

    insights.push({
      id: 'top-expense-category',
      type: 'category',
      tone:
        changePercent !== null && Number(changePercent) > 15
          ? 'warning'
          : sharePercent >= 35
            ? 'warning'
            : 'neutral',
      title: `${topCategory.categoryName} lidera os gastos`,
      amount: Number(topCategory.total || 0),
      detail:
        changePercent === null
          ? `${sharePercent.toFixed(0)}% das despesas categorizadas estão concentradas aqui.`
          : `${sharePercent.toFixed(0)}% das despesas · ${
              Number(changePercent) >= 0 ? '+' : ''
            }${Number(changePercent).toFixed(0)}% vs. mês anterior.`,
      to: `/transactions?category=${encodeURIComponent(topCategory.categoryId || '')}`,
      actionLabel: 'Ver lançamentos',
    })
  }

  const overdueCount = Number(paymentSummary.overdueCount || 0)
  const dueSoonCount = Number(paymentSummary.dueNext7DaysCount || 0)
  const totalReserved = Number(savingsOverview.totalBalance || 0)
  const periodNet = Number(savingsOverview.periodNet || 0)

  if (overdueCount === 0 && dueSoonCount === 0 && totalReserved > 0) {
    insights.push({
      id: 'reserve-protection',
      type: 'reserve',
      tone: periodNet >= 0 ? 'positive' : 'neutral',
      title: periodNet >= 0 ? 'Reservas seguem fortalecidas' : 'Reservas exigem acompanhamento',
      amount: totalReserved,
      detail:
        periodNet >= 0
          ? `O patrimônio reservado cresceu ${Math.abs(periodNet).toFixed(2) > 0 ? 'neste período' : 'sem retiradas líquidas relevantes'}.`
          : 'Houve retirada líquida das reservas no período visualizado.',
      to: '/savings',
      actionLabel: 'Abrir reservas',
    })
  } else if (overdueCount > 0 || dueSoonCount > 0) {
    insights.push({
      id: 'payment-protection',
      type: 'payments',
      tone: overdueCount > 0 ? 'negative' : 'warning',
      title:
        overdueCount > 0
          ? `${overdueCount} ${overdueCount === 1 ? 'pagamento atrasado' : 'pagamentos atrasados'}`
          : `${dueSoonCount} ${dueSoonCount === 1 ? 'vencimento próximo' : 'vencimentos próximos'}`,
      amount:
        overdueCount > 0
          ? Number(paymentSummary.overdueAmount || 0)
          : Number(paymentSummary.dueNext7DaysAmount || 0),
      detail:
        overdueCount > 0
          ? 'Regularizar esses compromissos reduz pressão sobre o resultado do mês.'
          : 'Antecipar esses compromissos ajuda a proteger o resultado projetado.',
      to: '/transactions',
      actionLabel: overdueCount > 0 ? 'Regularizar' : 'Ver vencimentos',
    })
  } else if (budgetMonthKey) {
    insights.push({
      id: 'budget-follow-up',
      type: 'budget',
      tone: 'neutral',
      title: 'Planejamento mensal em dia',
      amount: null,
      detail: 'Acompanhe os limites ativos para preservar o resultado até o fechamento do mês.',
      to: `/budgets?month=${budgetMonthKey}`,
      actionLabel: 'Abrir orçamento',
    })
  }

  return insights.slice(0, 3)
}
