import {
  buildMonthAttentionSignals,
  getCalendarMonthBounds,
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
    { id: 'newer', date: '2026-08-25', type: 'expense', amount: 60 },
  ]

  expect(
    getRecentDashboardTransactions(transactions, {
      start: '2026-08-01',
      end: '2026-08-31',
    }).map((transaction) => transaction.id),
  ).toEqual(['newer', 'credit-purchase', 'older'])
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
