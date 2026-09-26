const PRIORITY_LIMIT = 3

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatMoney = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value))

const createPriority = ({
  id,
  area,
  level,
  weight,
  title,
  detail,
  actionLabel,
  to,
  source,
}) => ({
  id,
  area,
  level,
  weight,
  title,
  detail,
  actionLabel,
  to,
  source,
})

export function buildMoneyPriorities({
  paymentSummary = {},
  budgetAlerts = [],
  balance = 0,
  healthReport = {},
  spendingLeakReport = {},
  goals = [],
} = {}) {
  const priorities = []

  if (toNumber(paymentSummary.overdueCount) > 0 && toNumber(paymentSummary.overdueAmount) > 0) {
    priorities.push(
      createPriority({
        id: 'payments-overdue',
        area: 'payments',
        level: 'critical',
        weight: 100,
        title: 'Regularize pagamentos atrasados',
        detail: `${paymentSummary.overdueCount} ${
          paymentSummary.overdueCount === 1 ? 'pagamento soma' : 'pagamentos somam'
        } ${formatMoney(paymentSummary.overdueAmount)} em atraso.`,
        actionLabel: 'Revisar pagamentos',
        to: '/transactions',
        source: 'payment',
      }),
    )
  }

  const overBudget = (Array.isArray(budgetAlerts) ? budgetAlerts : [])
    .filter((item) => toNumber(item.pct) > 100)
    .sort((a, b) => toNumber(b.pct) - toNumber(a.pct))[0]

  if (overBudget) {
    const limit = toNumber(overBudget.budget?.amount)
    const spent = toNumber(overBudget.spent)
    const excess = Math.max(0, spent - limit)
    const categoryName = overBudget.cat?.name || 'Uma categoria'

    priorities.push(
      createPriority({
        id: `budget-over-${overBudget.budget?.categoryId || categoryName}`,
        area: 'budget',
        level: 'critical',
        weight: 92,
        title: `${categoryName} ultrapassou o orçamento`,
        detail:
          excess > 0
            ? `${formatMoney(excess)} acima do limite definido para o período.`
            : `${toNumber(overBudget.pct).toFixed(0)}% do limite mensal utilizado.`,
        actionLabel: 'Revisar orçamento',
        to: '/budgets',
        source: 'budget',
      }),
    )
  }

  if (toNumber(balance) < 0) {
    const balanceGap = formatMoney(Math.abs(toNumber(balance)))

    priorities.push(
      createPriority({
        id: 'negative-balance',
        area: 'balance',
        level: 'critical',
        weight: 88,
        title: 'Recupere o equilíbrio do período',
        detail: `As despesas estão ${balanceGap} acima das receitas.`,
        actionLabel: 'Revisar transações',
        to: '/transactions',
        source: 'health',
      }),
    )
  }

  if (
    toNumber(paymentSummary.dueNext7DaysCount) > 0 &&
    toNumber(paymentSummary.dueNext7DaysAmount) > 0
  ) {
    priorities.push(
      createPriority({
        id: 'payments-due-soon',
        area: 'payments',
        level: 'warning',
        weight: 78,
        title: 'Prepare os próximos vencimentos',
        detail: `${paymentSummary.dueNext7DaysCount} ${
          paymentSummary.dueNext7DaysCount === 1 ? 'obrigação vence' : 'obrigações vencem'
        } nos próximos 7 dias, somando ${formatMoney(paymentSummary.dueNext7DaysAmount)}.`,
        actionLabel: 'Ver vencimentos',
        to: '/transactions',
        source: 'payment',
      }),
    )
  }

  const budgetAttention = (Array.isArray(budgetAlerts) ? budgetAlerts : [])
    .filter((item) => toNumber(item.pct) >= 70 && toNumber(item.pct) <= 100)
    .sort((a, b) => toNumber(b.pct) - toNumber(a.pct))[0]

  if (budgetAttention) {
    const categoryName = budgetAttention.cat?.name || 'Uma categoria'
    const usedPercent = toNumber(budgetAttention.pct).toFixed(0)

    priorities.push(
      createPriority({
        id: `budget-attention-${budgetAttention.budget?.categoryId || categoryName}`,
        area: 'budget',
        level: 'warning',
        weight: 72,
        title: `${categoryName} está perto do limite`,
        detail: `${usedPercent}% do orçamento mensal já foi utilizado.`,
        actionLabel: 'Acompanhar orçamento',
        to: '/budgets',
        source: 'budget',
      }),
    )
  }

  const leakFinding = spendingLeakReport?.findings?.[0]
  if (spendingLeakReport?.status === 'attention' && leakFinding) {
    priorities.push(
      createPriority({
        id: `leak-${leakFinding.id}`,
        area: 'spending',
        level: 'warning',
        weight: 66,
        title: leakFinding.title,
        detail: leakFinding.detail,
        actionLabel: leakFinding.actionLabel || 'Revisar gastos',
        to: leakFinding.to || '/transactions',
        source: 'diagnostic',
      }),
    )
  }

  const healthAction = healthReport?.nextAction
  if (healthAction && toNumber(healthAction.missingPoints) > 0) {
    const missingPoints = toNumber(healthAction.missingPoints)
    const duplicateAreas = {
      balance: 'balance',
      budgets: 'budget',
      income: 'income',
      saving: 'saving',
      goals: 'goals',
    }
    const area = duplicateAreas[healthAction.id] || healthAction.id || 'health'

    priorities.push(
      createPriority({
        id: `health-${healthAction.id || 'next'}`,
        area,
        level: 'opportunity',
        weight: 45 + Math.min(20, missingPoints),
        title: `Fortaleça: ${healthAction.label}`,
        detail: `Este fator ainda pode acrescentar até ${missingPoints} pontos à sua saúde financeira.`,
        actionLabel: healthAction.actionLabel || 'Ver detalhes',
        to: healthAction.to || '/transactions',
        source: 'health',
      }),
    )
  }

  if ((!Array.isArray(goals) || goals.length === 0) && healthAction?.id !== 'goals') {
    priorities.push(
      createPriority({
        id: 'goals-empty',
        area: 'goals',
        level: 'opportunity',
        weight: 38,
        title: 'Defina uma meta financeira',
        detail: 'Uma meta ajuda a transformar sobra de caixa em um objetivo acompanhado.',
        actionLabel: 'Criar meta',
        to: '/goals',
        source: 'goals',
      }),
    )
  }

  const deduplicated = []
  const seenAreas = new Set()

  priorities
    .sort((a, b) => b.weight - a.weight)
    .forEach((priority) => {
      if (seenAreas.has(priority.area)) return
      seenAreas.add(priority.area)
      deduplicated.push(priority)
    })

  return {
    priorities: deduplicated.slice(0, PRIORITY_LIMIT),
    totalSignals: deduplicated.length,
    hasCritical: deduplicated.some((priority) => priority.level === 'critical'),
  }
}

export { PRIORITY_LIMIT as MONEY_PRIORITY_LIMIT }
