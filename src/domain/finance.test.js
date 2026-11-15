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

test('usa a data da movimentação para o mês e não o vencimento', () => {
  const item = {
    type: 'expense',
    amount: 90,
    date: '2026-07-13',
    dueDate: '2026-08-01',
    categoryId: 'food',
  }

  expect(transactionsForMonth([item], 2026, 6)).toHaveLength(1)
  expect(transactionsForMonth([item], 2026, 7)).toHaveLength(0)
})

test('ignora cancelamentos e transferências explícitas nos totais', () => {
  const result = summarizeTransactions([
    ...transactions,
    {
      type: 'expense',
      amount: 500,
      date: '2026-07-20',
      paymentStatus: 'cancelled',
    },
    {
      type: 'expense',
      amount: 800,
      date: '2026-07-21',
      flowType: 'transfer',
    },
  ])

  expect(result).toEqual({
    income: 1000,
    expenses: 250,
    savings: 0,
    balance: 750,
    count: 2,
  })
})

test('retirada da poupança reduz o reservado sem virar despesa', () => {
  const result = summarizeTransactions([
    ...transactions,
    {
      type: 'income',
      isSavings: true,
      savingsMovement: 'deposit',
      amount: 500,
      date: '2026-07-15',
    },
    {
      type: 'income',
      isSavings: true,
      savingsMovement: 'withdrawal',
      amount: 200,
      date: '2026-07-20',
    },
  ])

  expect(result.savings).toBe(300)
  expect(result.income).toBe(1000)
  expect(result.expenses).toBe(250)
  expect(result.balance).toBe(750)
})

test('MR-006: cálculo principal mantém centavos e separa reservas de consumo', () => {
  const source = [
    { type: 'income', amount: '100.10' },
    { type: 'income', amount: '0.20' },
    { type: 'expense', amount: '25,15' },
    { type: 'expense', amount: 0.05 },
    { type: 'income', isSavings: true, savingsMovement: 'deposit', amount: '0.10' },
    { type: 'income', isSavings: true, savingsMovement: 'deposit', amount: 0.2 },
    { type: 'income', isSavings: true, savingsMovement: 'withdrawal', amount: '0.05' },
    { type: 'income', amount: '500', flowType: 'transfer' },
  ]
  const original = structuredClone(source)
  expect(summarizeTransactions(source)).toEqual({
    income: 100.3,
    expenses: 25.2,
    savings: 0.25,
    balance: 75.1,
    count: 7,
  })
  expect(source).toEqual(original)
})

test('MR-006: orçamento converte legado antes da soma e preserva atividade de compra', () => {
  const actual = calculateBudgetUsage(
    [
      { type: 'expense', categoryId: 'food', amount: '0.10', date: '2026-07-02' },
      { type: 'expense', categoryId: 'food', amount: '0.20', date: '2026-07-03' },
      {
        type: 'expense',
        categoryId: 'food',
        amount: '0,05',
        paymentMethod: 'credit_card',
        isCreditPurchase: true,
        purchaseDate: '2026-07-04',
        date: '2026-08-12',
      },
      { type: 'expense', categoryId: 'food', amount: 100, date: '2026-07-04', isSavings: true },
    ],
    { categoryId: 'food', amount: '1.00' },
    new Date(2026, 6, 15),
  )
  expect(actual).toEqual({ spent: 0.35, percent: 35 })
})

test('MR-006: montantes corrompidos não são convertidos silenciosamente em zero', () => {
  expect(() => summarizeTransactions([{ type: 'expense', amount: '1,234' }])).toThrow(
    'Valor monetário inválido',
  )
  expect(() => calculateBudgetUsage([], { categoryId: 'food', amount: 'R$ 1.234' })).toThrow(
    'Valor monetário inválido',
  )
})
