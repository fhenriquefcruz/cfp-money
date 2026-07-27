import {
  analyzeMoney,
  getEquivalentPeriods,
  getFinancialCycle,
  normalizeMoneySettings,
} from './money'

const transactions = [
  {
    id: 'income-current',
    type: 'income',
    amount: 5000,
    date: '2026-07-05',
    categoryId: 'salary',
  },
  {
    id: 'market-current',
    type: 'expense',
    amount: 600,
    date: '2026-07-10',
    categoryId: 'market',
    categoryName: 'Mercado',
  },
  {
    id: 'transport-current',
    type: 'expense',
    amount: 300,
    date: '2026-07-12',
    categoryId: 'transport',
    categoryName: 'Transporte',
  },
  {
    id: 'savings-current',
    type: 'expense',
    amount: 1000,
    date: '2026-07-08',
    isSavings: true,
    categoryId: 'savings',
    categoryName: 'Poupança',
  },
  {
    id: 'income-previous',
    type: 'income',
    amount: 4800,
    date: '2026-06-05',
    categoryId: 'salary',
  },
  {
    id: 'market-previous',
    type: 'expense',
    amount: 800,
    date: '2026-06-10',
    categoryId: 'market',
    categoryName: 'Mercado',
  },
  {
    id: 'transport-previous',
    type: 'expense',
    amount: 100,
    date: '2026-06-12',
    categoryId: 'transport',
    categoryName: 'Transporte',
  },
]

test('normaliza configurações sem permitir dias de ciclo inseguros', () => {
  expect(
    normalizeMoneySettings({
      cycleType: 'salary_cycle',
      cycleStartDay: 31,
      comparisonMode: 'elapsed_days',
    }),
  ).toMatchObject({
    cycleType: 'salary_cycle',
    cycleStartDay: 28,
    comparisonMode: 'elapsed_days',
  })
})

test('usa mês civil como padrão', () => {
  expect(getFinancialCycle('2026-07-15')).toMatchObject({
    start: '2026-07-01',
    end: '2026-07-31',
    elapsedEnd: '2026-07-15',
    elapsedDays: 15,
    totalDays: 31,
  })
})

test('calcula ciclo personalizado iniciado no dia 5', () => {
  expect(
    getFinancialCycle('2026-07-03', {
      cycleType: 'salary_cycle',
      cycleStartDay: 5,
    }),
  ).toMatchObject({
    start: '2026-06-05',
    end: '2026-07-04',
    elapsedEnd: '2026-07-03',
  })
})

test('compara exatamente o mesmo número de dias', () => {
  const periods = getEquivalentPeriods('2026-07-15', {
    cycleType: 'calendar_month',
    comparisonMode: 'elapsed_days',
  })

  expect(periods.current).toMatchObject({
    start: '2026-07-01',
    end: '2026-07-15',
    elapsedDays: 15,
  })
  expect(periods.previous).toMatchObject({
    start: '2026-06-01',
    end: '2026-06-15',
    elapsedDays: 15,
  })
})

test('gera análise equivalente, projeção e variação por categoria', () => {
  const result = analyzeMoney(transactions, {}, '2026-07-15')

  expect(result.current).toMatchObject({
    income: 5000,
    expenses: 900,
    balance: 4100,
    transactionCount: 3,
  })
  expect(result.previous).toMatchObject({
    income: 4800,
    expenses: 900,
    balance: 3900,
    transactionCount: 3,
  })
  expect(result.comparison.expenseChangePercent).toBe(0)
  expect(result.categories.largestIncrease).toMatchObject({
    categoryName: 'Transporte',
    difference: 200,
  })
  expect(result.projection.isPartial).toBe(true)
  expect(result.projection.expenses).toBeCloseTo(1860, 5)
})

test('não divide por zero quando não há período anterior', () => {
  const result = analyzeMoney(
    [
      {
        type: 'expense',
        amount: 150,
        date: '2026-07-10',
        categoryName: 'Saúde',
      },
    ],
    {},
    '2026-07-15',
  )

  expect(result.comparison.expenseChangePercent).toBeNull()
  expect(result.insights[0].message).toContain('não há despesas')
})
