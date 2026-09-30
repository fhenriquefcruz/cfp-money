const toFiniteNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const withMissingPoints = (factor) => ({
  ...factor,
  missingPoints: Math.max(0, factor.maxPoints - factor.points),
})

export function buildFinancialHealth({
  balance = 0,
  income = 0,
  expenses = 0,
  savingRate = 0,
  hasBudgets = false,
  budgetsOk = false,
  overdueCount = 0,
} = {}) {
  const safeBalance = toFiniteNumber(balance)
  const safeIncome = toFiniteNumber(income)
  const safeExpenses = toFiniteNumber(expenses)
  const safeSavingRate = toFiniteNumber(savingRate)
  const safeOverdueCount = Math.max(0, Math.floor(toFiniteNumber(overdueCount)))
  const expenseRatio = safeIncome > 0 ? (safeExpenses / safeIncome) * 100 : null

  const savingPoints =
    safeSavingRate >= 20 ? 25 : safeSavingRate >= 10 ? 12 : safeSavingRate > 0 ? 5 : 0
  const paymentPoints = safeOverdueCount === 0 ? 15 : safeOverdueCount === 1 ? 8 : 0
  const expenseRatioPoints =
    expenseRatio === null ? 0 : expenseRatio <= 70 ? 10 : expenseRatio <= 90 ? 5 : 0

  const factors = [
    withMissingPoints({
      id: 'balance',
      label: 'Equilíbrio do período',
      points: safeBalance >= 0 ? 30 : 0,
      maxPoints: 30,
      detail:
        safeBalance >= 0
          ? 'Receitas cobrem as despesas consideradas no período.'
          : 'As despesas consideradas superam as receitas do período.',
      actionLabel: 'Revisar transações',
      to: '/transactions',
    }),
    withMissingPoints({
      id: 'saving',
      label: 'Reserva no período',
      points: savingPoints,
      maxPoints: 25,
      detail:
        safeIncome > 0
          ? `Reserva registrada: ${safeSavingRate.toFixed(0)}% das receitas do período.`
          : 'Sem receitas no período; não há base suficiente para medir a taxa de reserva.',
      actionLabel: 'Revisar movimentações',
      to: '/transactions',
    }),
    withMissingPoints({
      id: 'budgets',
      label: 'Aderência aos orçamentos',
      points: hasBudgets && budgetsOk ? 20 : 0,
      maxPoints: 20,
      detail: !hasBudgets
        ? 'Nenhum orçamento mensal está configurado.'
        : budgetsOk
          ? 'Todos os orçamentos configurados estão dentro dos limites.'
          : 'Existe orçamento acima do limite mensal.',
      actionLabel: !hasBudgets ? 'Criar orçamento' : 'Revisar orçamentos',
      to: '/budgets',
    }),
    withMissingPoints({
      id: 'payments',
      label: 'Pontualidade dos pagamentos',
      points: paymentPoints,
      maxPoints: 15,
      detail:
        safeOverdueCount === 0
          ? 'Nenhum pagamento atrasado foi identificado.'
          : `${safeOverdueCount} ${safeOverdueCount === 1 ? 'pagamento atrasado' : 'pagamentos atrasados'} identificado${safeOverdueCount === 1 ? '' : 's'}.`,
      actionLabel: 'Revisar pagamentos',
      to: '/transactions',
    }),
    withMissingPoints({
      id: 'expense_ratio',
      label: 'Relação despesas / receitas',
      points: expenseRatioPoints,
      maxPoints: 10,
      detail:
        expenseRatio === null
          ? 'Sem receitas no período; a relação despesas/receitas não pode ser calculada.'
          : `As despesas representam ${expenseRatio.toFixed(0)}% das receitas do período.`,
      actionLabel: 'Revisar gastos',
      to: '/transactions',
    }),
  ]

  const score = Math.min(
    100,
    factors.reduce((total, factor) => total + factor.points, 0),
  )

  const label = score >= 75 ? 'Sólido' : score >= 50 ? 'Em atenção' : 'Crítico'
  const summary =
    score >= 75
      ? 'Os principais sinais do período estão controlados.'
      : score >= 50
        ? 'Há fatores relevantes que merecem revisão.'
        : 'Existem fatores com impacto material no período.'

  const nextAction =
    factors
      .filter((factor) => factor.missingPoints > 0)
      .sort((a, b) => b.missingPoints - a.missingPoints)[0] || null

  return {
    methodologyVersion: 2,
    score,
    label,
    summary,
    factors,
    nextAction,
  }
}
