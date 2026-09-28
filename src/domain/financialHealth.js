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
  savingRate = 0,
  hasBudgets = false,
  budgetsOk = false,
  goalsActive = false,
} = {}) {
  const safeBalance = toFiniteNumber(balance)
  const safeIncome = toFiniteNumber(income)
  const safeSavingRate = toFiniteNumber(savingRate)

  const savingPoints =
    safeSavingRate >= 20 ? 25 : safeSavingRate >= 10 ? 12 : safeSavingRate >= 0 ? 5 : 0

  const factors = [
    withMissingPoints({
      id: 'balance',
      label: 'Equilíbrio do mês',
      points: safeBalance >= 0 ? 30 : 0,
      maxPoints: 30,
      detail:
        safeBalance >= 0
          ? 'O saldo do mês está positivo ou zerado.'
          : 'O saldo do mês está negativo.',
      actionLabel: 'Revisar transações',
      to: '/transactions',
    }),
    withMissingPoints({
      id: 'saving',
      label: 'Poupança mensal',
      points: savingPoints,
      maxPoints: 25,
      detail:
        safeIncome > 0
          ? `Taxa de poupança do mês: ${safeSavingRate.toFixed(0)}% da renda.`
          : 'Sem receitas registradas no mês; a taxa considerada é 0%.',
      actionLabel: 'Revisar movimentações',
      to: '/transactions',
    }),
    withMissingPoints({
      id: 'budgets',
      label: 'Orçamentos',
      points: hasBudgets && budgetsOk ? 20 : 0,
      maxPoints: 20,
      detail: !hasBudgets
        ? 'Nenhum orçamento mensal está configurado.'
        : budgetsOk
          ? 'Os orçamentos cadastrados estão dentro dos limites.'
          : 'Existe orçamento acima do limite mensal.',
      actionLabel: !hasBudgets ? 'Criar orçamento' : 'Revisar orçamentos',
      to: '/budgets',
    }),
    withMissingPoints({
      id: 'goals',
      label: 'Metas',
      points: goalsActive ? 15 : 0,
      maxPoints: 15,
      detail: goalsActive ? 'Há pelo menos uma meta cadastrada.' : 'Nenhuma meta está cadastrada.',
      actionLabel: goalsActive ? 'Ver metas' : 'Criar meta',
      to: '/goals',
    }),
    withMissingPoints({
      id: 'income',
      label: 'Receitas',
      points: safeIncome > 0 ? 10 : 0,
      maxPoints: 10,
      detail:
        safeIncome > 0
          ? 'Há receitas registradas no mês.'
          : 'Nenhuma receita está registrada no mês.',
      actionLabel: 'Registrar receita',
      to: '/transactions',
    }),
  ]

  const score = Math.min(
    100,
    factors.reduce((total, factor) => total + factor.points, 0),
  )

  const label = score >= 75 ? 'Ótima' : score >= 50 ? 'Regular' : 'Atenção'
  const summary =
    score >= 75
      ? 'Finanças equilibradas.'
      : score >= 50
        ? 'Há pontos a melhorar.'
        : 'Revise os fatores com maior impacto.'

  const nextAction =
    factors
      .filter((factor) => factor.missingPoints > 0)
      .sort((a, b) => b.missingPoints - a.missingPoints)[0] || null

  return {
    score,
    label,
    summary,
    factors,
    nextAction,
  }
}
