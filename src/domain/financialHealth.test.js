import { buildFinancialHealth } from './financialHealth'

test('chega a 100 pontos somente com sinais financeiros favoráveis', () => {
  const report = buildFinancialHealth({
    balance: 1200,
    income: 5000,
    expenses: 3000,
    savingRate: 20,
    hasBudgets: true,
    budgetsOk: true,
    overdueCount: 0,
  })

  expect(report.methodologyVersion).toBe(2)
  expect(report.score).toBe(100)
  expect(report.label).toBe('Sólido')
  expect(report.factors.map((factor) => factor.points)).toEqual([30, 25, 20, 15, 10])
  expect(report.nextAction).toBeNull()
})

test('não concede pontos apenas por existir receita ou meta cadastrada', () => {
  const report = buildFinancialHealth({
    balance: -1,
    income: 3000,
    expenses: 3200,
    savingRate: 0,
    hasBudgets: false,
    budgetsOk: false,
    overdueCount: 2,
  })

  expect(report.score).toBe(0)
  expect(report.factors.map((factor) => factor.id)).toEqual([
    'balance',
    'saving',
    'budgets',
    'payments',
    'expense_ratio',
  ])
})

test('mantém faixa intermediária de reserva e pontualidade parcial', () => {
  const report = buildFinancialHealth({
    balance: 300,
    income: 3000,
    expenses: 2400,
    savingRate: 10,
    hasBudgets: true,
    budgetsOk: false,
    overdueCount: 1,
  })

  expect(report.score).toBe(55)
  expect(report.label).toBe('Em atenção')
  expect(report.factors.find((factor) => factor.id === 'saving')?.points).toBe(12)
  expect(report.factors.find((factor) => factor.id === 'payments')?.points).toBe(8)
  expect(report.factors.find((factor) => factor.id === 'expense_ratio')?.points).toBe(5)
})

test('explica ausência de orçamento sem confundir com orçamento estourado', () => {
  const withoutBudget = buildFinancialHealth({
    hasBudgets: false,
    budgetsOk: false,
  }).factors.find((factor) => factor.id === 'budgets')

  const overBudget = buildFinancialHealth({
    hasBudgets: true,
    budgetsOk: false,
  }).factors.find((factor) => factor.id === 'budgets')

  expect(withoutBudget.detail).toMatch(/Nenhum orçamento/)
  expect(withoutBudget.actionLabel).toBe('Criar orçamento')
  expect(overBudget.detail).toMatch(/acima do limite/)
  expect(overBudget.actionLabel).toBe('Revisar orçamentos')
})

test('prioriza como próxima ação o fator com maior quantidade de pontos faltantes', () => {
  const report = buildFinancialHealth({
    balance: -500,
    income: 4000,
    expenses: 3600,
    savingRate: 10,
    hasBudgets: true,
    budgetsOk: false,
    overdueCount: 1,
  })

  expect(report.nextAction?.id).toBe('balance')
  expect(report.nextAction?.missingPoints).toBe(30)
})

test('suspende a pontuação quando há classificações suspeitas', () => {
  const report = buildFinancialHealth({
    balance: 1200,
    income: 5000,
    expenses: 3000,
    savingRate: 20,
    hasBudgets: true,
    budgetsOk: true,
    overdueCount: 0,
    categoryReviewCount: 2,
  })

  expect(report.score).toBeNull()
  expect(report.label).toBe('Em revisão')
  expect(report.dataQuality).toEqual({
    scoreAvailable: false,
    categoryReviewCount: 2,
  })
  expect(report.nextAction).toMatchObject({
    id: 'data_quality',
    to: '/transactions?review=categories&scope=all',
  })
})
