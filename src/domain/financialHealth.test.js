import { buildFinancialHealth } from './financialHealth'

test('preserva a fórmula atual e chega a 100 pontos no melhor cenário', () => {
  const report = buildFinancialHealth({
    balance: 1200,
    income: 5000,
    savingRate: 20,
    hasBudgets: true,
    budgetsOk: true,
    goalsActive: true,
  })

  expect(report.score).toBe(100)
  expect(report.label).toBe('Ótima')
  expect(report.factors.map((factor) => factor.points)).toEqual([30, 25, 20, 15, 10])
  expect(report.nextAction).toBeNull()
})

test('mantém as faixas intermediária e inicial da poupança', () => {
  expect(
    buildFinancialHealth({
      balance: -1,
      income: 3000,
      savingRate: 10,
      hasBudgets: false,
      budgetsOk: false,
      goalsActive: false,
    }).score,
  ).toBe(22)

  expect(
    buildFinancialHealth({
      balance: -1,
      income: 0,
      savingRate: 0,
      hasBudgets: false,
      budgetsOk: false,
      goalsActive: false,
    }).score,
  ).toBe(5)
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
    savingRate: 10,
    hasBudgets: true,
    budgetsOk: false,
    goalsActive: false,
  })

  expect(report.score).toBe(22)
  expect(report.nextAction?.id).toBe('balance')
  expect(report.nextAction?.missingPoints).toBe(30)
})
