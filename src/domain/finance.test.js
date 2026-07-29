import {
  calculateBudgetUsage,
  calculateCurrentBalance,
  defaultDateRangeEnd,
  summarizeTransactions,
  transactionsForMonth,
} from './finance'

const transactions = [
  {
    type: 'income',
    amount: 1000,
    date: '2026-07-01',
    categoryId: 'salary',
  },
  {
    type: 'expense',
    amount: 250,
    date: '2026-07-10',
    categoryId: 'food',
  },
]

test('resume entradas, despesas, poupança e saldo', () => {
  expect(summarizeTransactions(transactions)).toEqual({
    income: 1000,
    expenses: 250,
    savings: 0,
    balance: 750,
    count: 2,
  })
})

test('poupança fica separada e não infla receita ou saldo', () => {
  const withSavings = [
    ...transactions,
    {
      type: 'income',
      isSavings: true,
      amount: 300,
      date: '2026-07-15',
      categoryId: '_savings',
    },
  ]

  expect(summarizeTransactions(withSavings)).toEqual({
    income: 1000,
    expenses: 250,
    savings: 300,
    balance: 750,
    count: 3,
  })
  expect(calculateCurrentBalance(withSavings)).toBe(750)
})

test('filtra por mês sem depender do fuso horário', () => {
  expect(transactionsForMonth(transactions, 2026, 6)).toHaveLength(2)
})

test('ignora datas inválidas ao filtrar o mês', () => {
  expect(
    transactionsForMonth([...transactions, { type: 'expense', amount: 10, date: '' }], 2026, 6),
  ).toHaveLength(2)
})

test('calcula uso do orçamento mensal', () => {
  expect(
    calculateBudgetUsage(transactions, { categoryId: 'food', amount: 500 }, new Date(2026, 6, 15)),
  ).toEqual({ spent: 250, percent: 50 })
})

test('sugere o fim do período 30 dias após a data inicial', () => {
  expect(defaultDateRangeEnd('2026-07-22')).toBe('2026-08-21')
  expect(defaultDateRangeEnd('2026-01-31')).toBe('2026-03-02')
  expect(defaultDateRangeEnd('')).toBe('')
})
