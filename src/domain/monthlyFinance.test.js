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
