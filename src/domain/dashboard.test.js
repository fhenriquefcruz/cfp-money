import {
  buildCategoryBreakdown,
  buildMonthAttentionSignals,
  getCalendarMonthBounds,
  getLargestMonthlyExpenseChange,
  getRecentDashboardTransactions,
} from './dashboard'

test('gera limites mensais em data local sem converter para UTC', () => {
  expect(getCalendarMonthBounds(new Date(2026, 7, 15, 23, 30))).toEqual({
    start: '2026-08-01',
    end: '2026-08-31',
  })
})

test('exclui o mês seguinte e ordena as transações recentes por atividade', () => {
  const transactions = [
    { id: 'older', date: '2026-08-03', type: 'expense', amount: 20 },
    { id: 'next-month', date: '2026-09-01', type: 'expense', amount: 30 },
    { id: 'savings', date: '2026-08-30', type: 'expense', amount: 40, isSavings: true },
    {
      id: 'credit-purchase',
      date: '2026-08-31',
      dueDate: '2026-08-31',
      purchaseDate: '2026-08-20',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      type: 'expense',
      amount: 50,
    },
    {
      id: 'manual-different-due',
      date: '2026-08-28',
      dueDate: '2026-09-05',
      type: 'expense',
      amount: 70,
    },
    { id: 'newer', date: '2026-08-25', type: 'expense', amount: 60 },
  ]

  expect(
    getRecentDashboardTransactions(transactions, {
      start: '2026-08-01',
      end: '2026-08-31',
    }).map((transaction) => transaction.id),
  ).toEqual(['manual-different-due', 'newer', 'credit-purchase', 'older'])
})

test('prioriza atrasos, vencimentos e orçamento antes do saldo negativo', () => {
  const signals = buildMonthAttentionSignals({
    paymentSummary: {
      overdueCount: 2,
      overdueAmount: 350,
      dueNext7DaysCount: 1,
      dueNext7DaysAmount: 120,
    },
    budgetAlerts: [
      {
        budget: { id: 'food', amount: 1000 },
        cat: { name: 'Alimentação' },
        spent: 920,
        pct: 92,
      },
    ],
    balance: -500,
  })

  expect(signals.map((signal) => signal.type)).toEqual(['overdue', 'due-soon', 'budget'])
  expect(signals).toHaveLength(3)
})

test('inclui saldo negativo quando ainda existe espaço na Central do mês', () => {
  expect(
    buildMonthAttentionSignals({
      paymentSummary: {},
      budgetAlerts: [],
      balance: -480,
    }),
  ).toEqual([
    {
      type: 'negative-balance',
      amount: 480,
    },
  ])
})

test('ordena categorias por gasto e calcula participação e variação', () => {
  const result = buildCategoryBreakdown(
    [
      { categoryId: 'food', categoryName: 'Alimentação', total: 600 },
      { categoryId: 'transport', categoryName: 'Transporte', total: 400 },
    ],
    [
      { categoryId: 'food', categoryName: 'Alimentação', total: 500 },
      { categoryId: 'transport', categoryName: 'Transporte', total: 500 },
    ],
  )

  expect(result.map((item) => item.categoryId)).toEqual(['food', 'transport'])
  expect(result[0]).toMatchObject({
    sharePercent: 60,
    changePercent: 20,
  })
  expect(result[1]).toMatchObject({
    sharePercent: 40,
    changePercent: -20,
  })
})

test('encontra a maior mudança absoluta de despesas entre meses', () => {
  expect(
    getLargestMonthlyExpenseChange([
      { monthKey: '2026-06', fullMonth: 'junho de 2026', expenses: 1000 },
      { monthKey: '2026-07', fullMonth: 'julho de 2026', expenses: 1600 },
      { monthKey: '2026-08', fullMonth: 'agosto de 2026', expenses: 1200 },
    ]),
  ).toMatchObject({
    monthKey: '2026-07',
    delta: 600,
    percent: 60,
  })
})
