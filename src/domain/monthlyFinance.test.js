import { getMonthlyFinancialData, groupTransactionsByActivityMonth } from './monthlyFinance'

test('usa data da movimentação e ignora cancelamentos', () => {
  const transactions = [
    {
      id: 'manual-july',
      type: 'expense',
      amount: 200,
      date: '2026-07-20',
      dueDate: '2026-08-05',
    },
    {
      id: 'cancelled',
      type: 'expense',
      amount: 900,
      date: '2026-07-21',
      paymentStatus: 'cancelled',
    },
    {
      id: 'income',
      type: 'income',
      amount: 1000,
      date: '2026-07-05',
    },
  ]

  expect(groupTransactionsByActivityMonth(transactions)['2026-07'].map((item) => item.id)).toEqual([
    'manual-july',
    'income',
  ])

  const data = getMonthlyFinancialData(transactions, 1, new Date(2026, 6, 15))
  expect(data[0]).toMatchObject({
    income: 1000,
    expenses: 200,
    balance: 800,
  })
})

test('usa purchaseDate para compra estruturada no cartão', () => {
  const data = getMonthlyFinancialData(
    [
      {
        id: 'card',
        type: 'expense',
        amount: 300,
        paymentMethod: 'credit_card',
        isCreditPurchase: true,
        purchaseDate: '2026-07-28',
        date: '2026-08-10',
        dueDate: '2026-08-10',
      },
    ],
    1,
    new Date(2026, 6, 15),
  )

  expect(data[0].expenses).toBe(300)
})

test('poupança mensal usa aportes menos retiradas', () => {
  const data = getMonthlyFinancialData(
    [
      {
        id: 'save',
        type: 'income',
        isSavings: true,
        savingsMovement: 'deposit',
        amount: 600,
        date: '2026-07-08',
      },
      {
        id: 'withdraw',
        type: 'income',
        isSavings: true,
        savingsMovement: 'withdrawal',
        amount: 150,
        date: '2026-07-12',
      },
    ],
    1,
    new Date(2026, 6, 15),
  )

  expect(data[0].savings).toBe(450)
  expect(data[0].income).toBe(0)
  expect(data[0].expenses).toBe(0)
})

test('MR-006: série mensal, resumo financeiro e categorias usam os mesmos centavos', () => {
  const items = [
    { type: 'income', date: '2026-07-01', amount: '10.01' },
    { type: 'income', date: '2026-07-02', amount: 0.02 },
    { type: 'expense', date: '2026-07-03', amount: '0.10', categoryId: 'food' },
    { type: 'expense', date: '2026-07-04', amount: '0.20', categoryId: 'food' },
    { type: 'expense', date: '2026-07-05', amount: 1.01, categoryId: 'home' },
    { type: 'expense', date: '2026-07-06', amount: 'invalid', categoryId: 'home' },
    {
      type: 'income',
      date: '2026-07-07',
      isSavings: true,
      amount: '0.20',
      savingsMovement: 'deposit',
    },
    {
      type: 'income',
      date: '2026-07-08',
      isSavings: true,
      amount: '0.10',
      savingsMovement: 'withdrawal',
    },
    { type: 'expense', date: '2026-07-09', amount: '100.00', paymentStatus: 'cancelled' },
    { type: 'expense', date: '2026-07-10', amount: '100.00', flowType: 'transfer' },
    {
      type: 'expense',
      date: '2026-08-05',
      purchaseDate: '2026-07-28',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      amount: '2.20',
      categoryId: 'education',
    },
  ]
  const before = structuredClone(items)
  const month = getMonthlyFinancialData(items, 1, new Date(2026, 6, 15))[0]
  expect(month.income).toBe(10.03)
  expect(month.expenses).toBe(3.51)
  expect(month.balance).toBe(6.52)
  expect(month.savings).toBe(0.1)
  expect(items).toEqual(before)
})

test('mantém rótulos pt-BR e competência ao atravessar ano, mês curto e ano bissexto', () => {
  const periods = getMonthlyFinancialData([], 4, new Date(2028, 2, 31))
  expect(periods.map(({ monthKey, month, fullMonth }) => ({ monthKey, month, fullMonth }))).toEqual([
    { monthKey: '2027-12', month: 'Dez', fullMonth: 'dezembro de 2027' },
    { monthKey: '2028-01', month: 'Jan', fullMonth: 'janeiro de 2028' },
    { monthKey: '2028-02', month: 'Fev', fullMonth: 'fevereiro de 2028' },
    { monthKey: '2028-03', month: 'Mar', fullMonth: 'março de 2028' },
  ])
  expect(periods.every(({ income, expenses, balance, savings }) => (
    income === 0 && expenses === 0 && balance === 0 && savings === 0
  ))).toBe(true)
})
