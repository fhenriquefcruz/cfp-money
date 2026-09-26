import { buildReportHighlights } from './reportHighlights'

test('resume os principais sinais do período sem alterar os totais', () => {
  const result = buildReportHighlights({
    periodTotals: {
      income: 12000,
      expenses: 9000,
      balance: 3000,
      savings: 1500,
      savingRate: 12.5,
    },
    categoryData: [
      { name: 'Moradia', value: 3000, count: 3 },
      { name: 'Alimentação', value: 1800, count: 14 },
    ],
    monthlyData: [
      { month: 'jul', income: 4000, expenses: 3500 },
      { month: 'ago', income: 4000, expenses: 2500 },
      { month: 'set', income: 4000, expenses: 3000 },
    ],
    period: 3,
  })

  expect(result.expenseIncomeRatio).toBe(75)
  expect(result.averageMonthlyExpenses).toBe(3000)
  expect(result.topCategory).toMatchObject({
    name: 'Moradia',
    share: 100 / 3,
  })
  expect(result.bestMonth?.month).toBe('ago')
  expect(result.tightestMonth?.month).toBe('jul')
})

test('não inventa percentuais quando não existe receita', () => {
  const result = buildReportHighlights({
    periodTotals: {
      income: 0,
      expenses: 500,
      balance: -500,
    },
    period: 1,
  })

  expect(result.expenseIncomeRatio).toBeNull()
  expect(result.topCategory).toBeNull()
})
