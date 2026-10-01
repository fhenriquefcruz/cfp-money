import {
  budgetMonthKey,
  buildMonthlyBudgetOverview,
  getBudgetForMonth,
  getBudgetSpent,
  getBudgetTransactions,
  shiftBudgetMonth,
} from './budgetPeriods'

test('gera e navega por competência mensal', () => {
  expect(budgetMonthKey(new Date(2026, 8, 26))).toBe('2026-09')
  expect(shiftBudgetMonth('2026-09', -1)).toBe('2026-08')
  expect(shiftBudgetMonth('2026-12', 1)).toBe('2027-01')
})

test('prioriza orçamento específico do mês e não carrega orçamento para outro mês', () => {
  const budgets = [
    { id: 'legacy', categoryId: 'food', amount: 500 },
    { id: 'sep', categoryId: 'food', amount: 700, monthKey: '2026-09' },
  ]

  expect(getBudgetForMonth(budgets, 'food', '2026-09', '2026-09')).toMatchObject({
    id: 'sep',
    amount: 700,
  })

  expect(getBudgetForMonth(budgets, 'food', '2026-08', '2026-09')).toBeNull()
})

test('usa orçamento legado somente como transição no mês vigente', () => {
  const budgets = [{ id: 'legacy', categoryId: 'food', amount: 500 }]

  expect(getBudgetForMonth(budgets, 'food', '2026-09', '2026-09')).toMatchObject({
    id: 'legacy',
  })
  expect(getBudgetForMonth(budgets, 'food', '2026-10', '2026-09')).toBeNull()
})

test('calcula consumo pelo mês da compra e não pelo vencimento da fatura', () => {
  const transactions = [
    {
      type: 'expense',
      amount: 300,
      categoryId: 'food',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      purchaseDate: '2026-08-28',
      dueDate: '2026-09-10',
      date: '2026-09-10',
    },
    {
      type: 'expense',
      amount: 120,
      categoryId: 'food',
      date: '2026-09-05',
    },
  ]

  expect(getBudgetSpent(transactions, 'food', '2026-08')).toBe(300)
  expect(getBudgetSpent(transactions, 'food', '2026-09')).toBe(120)
})

test('ignora despesas canceladas no consumo do orçamento', () => {
  const transactions = [
    {
      type: 'expense',
      amount: 100,
      categoryId: 'food',
      date: '2026-09-05',
      paymentStatus: 'cancelled',
    },
  ]

  expect(getBudgetSpent(transactions, 'food', '2026-09')).toBe(0)
})

test('resume apenas os limites e gastos da competência escolhida', () => {
  const report = buildMonthlyBudgetOverview({
    budgets: [
      { categoryId: 'food', amount: 500, monthKey: '2026-09' },
      { categoryId: 'car', amount: 300, monthKey: '2026-08' },
    ],
    transactions: [
      { type: 'expense', categoryId: 'food', amount: 550, date: '2026-09-10' },
      { type: 'expense', categoryId: 'car', amount: 900, date: '2026-08-10' },
    ],
    monthKey: '2026-09',
    currentMonthKey: '2026-09',
  })

  expect(report).toMatchObject({
    totalBudgeted: 500,
    totalSpent: 550,
    overCount: 1,
  })
})


test('exclui transferências e expõe composição auditável do orçamento', () => {
  const transactions = [
    { id: 'food', type: 'expense', categoryId: 'food', amount: 300, date: '2026-09-05' },
    {
      id: 'transfer',
      type: 'expense',
      categoryId: 'food',
      amount: 900,
      date: '2026-09-06',
      flowType: 'transfer',
    },
    {
      id: 'unbudgeted',
      type: 'expense',
      categoryId: 'leisure',
      amount: 200,
      date: '2026-09-07',
    },
  ]

  expect(getBudgetTransactions(transactions, 'food', '2026-09').map((item) => item.id)).toEqual([
    'food',
  ])

  const report = buildMonthlyBudgetOverview({
    budgets: [{ categoryId: 'food', amount: 250, monthKey: '2026-09' }],
    transactions,
    monthKey: '2026-09',
    currentMonthKey: '2026-09',
  })

  expect(report).toMatchObject({
    totalBudgeted: 250,
    totalSpent: 300,
    totalAllSpent: 500,
    totalUnbudgetedSpent: 200,
    totalExceeded: 50,
    overCount: 1,
  })
  expect(report.items[0]).toMatchObject({
    spent: 300,
    excess: 50,
    percent: 120,
  })
})

test('considera todo gasto do mês como não orçado quando não há limite configurado', () => {
  const report = buildMonthlyBudgetOverview({
    budgets: [],
    transactions: [
      { type: 'expense', categoryId: 'food', amount: 120, date: '2026-09-05' },
      { type: 'expense', categoryId: 'car', amount: 80, date: '2026-09-06' },
    ],
    monthKey: '2026-09',
    currentMonthKey: '2026-09',
  })

  expect(report.totalBudgeted).toBe(0)
  expect(report.totalSpent).toBe(0)
  expect(report.totalAllSpent).toBe(200)
  expect(report.totalUnbudgetedSpent).toBe(200)
})
