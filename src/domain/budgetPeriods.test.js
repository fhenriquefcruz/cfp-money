import {
  budgetMonthKey,
  buildBudgetCarryoverPlan,
  buildMonthlyBudgetOverview,
  getBudgetForMonth,
  getBudgetSpent,
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


test('planeja cópia do mês anterior sem sobrescrever limites já definidos', () => {
  const plan = buildBudgetCarryoverPlan({
    budgets: [
      { categoryId: 'food', amount: 500, monthKey: '2026-08' },
      { categoryId: 'car', amount: 300, monthKey: '2026-08' },
      { categoryId: 'food', amount: 650, monthKey: '2026-09' },
      { categoryId: 'legacy', amount: 999 },
    ],
    sourceMonthKey: '2026-08',
    targetMonthKey: '2026-09',
    categoryIds: ['food', 'car'],
  })

  expect(plan).toEqual([{ categoryId: 'car', amount: 300 }])
})

test('ignora categorias removidas e orçamento legado ao copiar competência', () => {
  const plan = buildBudgetCarryoverPlan({
    budgets: [
      { categoryId: 'food', amount: 500, monthKey: '2026-08' },
      { categoryId: 'removed', amount: 200, monthKey: '2026-08' },
      { categoryId: 'legacy', amount: 900 },
    ],
    sourceMonthKey: '2026-08',
    targetMonthKey: '2026-09',
    categoryIds: ['food'],
  })

  expect(plan).toEqual([{ categoryId: 'food', amount: 500 }])
})


test('não copia orçamento quando nenhuma categoria de despesa é válida', () => {
  const plan = buildBudgetCarryoverPlan({
    budgets: [{ categoryId: 'food', amount: 500, monthKey: '2026-08' }],
    sourceMonthKey: '2026-08',
    targetMonthKey: '2026-09',
    categoryIds: [],
  })

  expect(plan).toEqual([])
})
