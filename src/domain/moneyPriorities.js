const LIMIT = 3
const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const money = (value) => currency.format(number(value))

export function buildMoneyPriorities({
  paymentSummary = {},
  budgetAlerts = [],
  balance = 0,
  healthReport = {},
  spendingLeakReport = {},
  goals = [],
} = {}) {
  const priorities = []
  const alerts = Array.isArray(budgetAlerts) ? budgetAlerts : []
  const add = (id, area, level, weight, title, detail, actionLabel, to, source) =>
    priorities.push({ id, area, level, weight, title, detail, actionLabel, to, source })

  if (number(paymentSummary.overdueCount) > 0 && number(paymentSummary.overdueAmount) > 0) {
    const count = number(paymentSummary.overdueCount)
    add(
      'payments-overdue',
      'payments',
      'critical',
      100,
      'Regularize pagamentos atrasados',
      `${count} ${count === 1 ? 'pagamento soma' : 'pagamentos somam'} ${money(
        paymentSummary.overdueAmount,
      )} em atraso.`,
      'Revisar pagamentos',
      '/transactions',
      'payment',
    )
  }

  const overBudget = alerts
    .filter((item) => number(item.pct) > 100)
    .sort((a, b) => number(b.pct) - number(a.pct))[0]

  if (overBudget) {
    const name = overBudget.cat?.name || 'Uma categoria'
    const excess = Math.max(0, number(overBudget.spent) - number(overBudget.budget?.amount))
    add(
      `budget-over-${overBudget.budget?.categoryId || name}`,
      'budget',
      'critical',
      92,
      `${name} ultrapassou o orçamento`,
      excess
        ? `${money(excess)} acima do limite definido para o período.`
        : `${number(overBudget.pct).toFixed(0)}% do limite mensal utilizado.`,
      'Revisar orçamento',
      '/budgets',
      'budget',
    )
  }

  if (number(balance) < 0) {
    add(
      'negative-balance',
      'balance',
      'critical',
      88,
      'Recupere o equilíbrio do período',
      `As despesas estão ${money(Math.abs(number(balance)))} acima das receitas.`,
      'Revisar transações',
      '/transactions',
      'health',
    )
  }

  if (
    number(paymentSummary.dueNext7DaysCount) > 0 &&
    number(paymentSummary.dueNext7DaysAmount) > 0
  ) {
    const count = number(paymentSummary.dueNext7DaysCount)
    add(
      'payments-due-soon',
      'payments',
      'warning',
      78,
      'Prepare os próximos vencimentos',
      `${count} ${count === 1 ? 'obrigação vence' : 'obrigações vencem'} nos próximos 7 dias, somando ${money(
        paymentSummary.dueNext7DaysAmount,
      )}.`,
      'Ver vencimentos',
      '/transactions',
      'payment',
    )
  }

  const budgetAttention = alerts
    .filter((item) => number(item.pct) >= 70 && number(item.pct) <= 100)
    .sort((a, b) => number(b.pct) - number(a.pct))[0]

  if (budgetAttention) {
    const name = budgetAttention.cat?.name || 'Uma categoria'
    add(
      `budget-attention-${budgetAttention.budget?.categoryId || name}`,
      'budget',
      'warning',
      72,
      `${name} está perto do limite`,
      `${number(budgetAttention.pct).toFixed(0)}% do orçamento mensal já foi utilizado.`,
      'Acompanhar orçamento',
      '/budgets',
      'budget',
    )
  }

  const leak = spendingLeakReport?.findings?.[0]
  if (spendingLeakReport?.status === 'attention' && leak) {
    add(
      `leak-${leak.id}`,
      'spending',
      'warning',
      66,
      leak.title,
      leak.detail,
      leak.actionLabel || 'Revisar gastos',
      leak.to || '/transactions',
      'diagnostic',
    )
  }

  const health = healthReport?.nextAction
  if (health && number(health.missingPoints) > 0) {
    const areas = { budgets: 'budget' }
    const missing = number(health.missingPoints)
    add(
      `health-${health.id || 'next'}`,
      areas[health.id] || health.id || 'health',
      'opportunity',
      45 + Math.min(20, missing),
      `Fortaleça: ${health.label}`,
      `Este fator ainda pode acrescentar até ${missing} pontos à sua saúde financeira.`,
      health.actionLabel || 'Ver detalhes',
      health.to || '/transactions',
      'health',
    )
  }

  if ((!Array.isArray(goals) || !goals.length) && health?.id !== 'goals') {
    add(
      'goals-empty',
      'goals',
      'opportunity',
      38,
      'Defina uma meta financeira',
      'Uma meta ajuda a transformar sobra de caixa em um objetivo acompanhado.',
      'Criar meta',
      '/goals',
      'goals',
    )
  }

  const seen = new Set()
  const ordered = priorities
    .sort((a, b) => b.weight - a.weight)
    .filter((item) => !seen.has(item.area) && seen.add(item.area))

  return {
    priorities: ordered.slice(0, LIMIT),
    totalSignals: ordered.length,
    hasCritical: ordered.some((item) => item.level === 'critical'),
  }
}

export { LIMIT as MONEY_PRIORITY_LIMIT }
