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

test('MR-006: agrega valores legados string e precisão centesimal por atividade', () => {
  const source = [
    { type: 'income', amount: '1000.10', date: '2026-07-01' },
    { type: 'income', amount: '0,20', date: '2026-07-02' },
    { type: 'expense', amount: 'R$ 1.234,56', date: '2026-07-03' },
    { type: 'expense', amount: '0.10', date: '2026-07-04' },
    { type: 'expense', amount: 0.2, date: '2026-07-05' },
    {
      type: 'expense',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      purchaseDate: '2026-07-06',
      date: '2026-08-10',
      amount: '0.05',
    },
    { type: 'expense', amount: 1000, date: '2026-07-07', paymentStatus: 'cancelled' },
  ]
  const original = structuredClone(source)
  const [month] = getMonthlyFinancialData(source, 1, new Date(2026, 6, 15))

  expect(month.income).toBe(1000.3)
  expect(month.expenses).toBe(1234.91)
  expect(month.balance).toBe(-234.61)
  expect(source).toEqual(original)
})

test('MR-006: reserva mensal não vira consumo nem perde centavos', () => {
  const [month] = getMonthlyFinancialData(
    [
      { type: 'expense', isSavings: true, amount: '0.10', date: '2026-07-01' },
      { type: 'expense', isSavings: true, amount: 0.2, date: '2026-07-02' },
      {
        type: 'income',
        isSavings: true,
        savingsMovement: 'withdrawal',
        amount: '0,05',
        date: '2026-07-03',
      },
    ],
    1,
    new Date(2026, 6, 15),
  )
  expect(month).toMatchObject({ income: 0, expenses: 0, savings: 0.25, balance: 0 })
})

test('MR-006: registros com precisão ou agrupamento ambíguos não geram total falso', () => {
  expect(() =>
    getMonthlyFinancialData(
      [{ type: 'expense', amount: '1.234', date: '2026-07-15' }],
      1,
      new Date(2026, 6, 15),
    ),
  ).toThrow('Valor monetário inválido')
})
