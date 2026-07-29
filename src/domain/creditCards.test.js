import {
  buildCreditTransaction,
  buildInstallmentTransactions,
  calculateInvoiceSchedule,
  splitInstallmentAmounts,
} from './creditCards'

const card = {
  id: 'nubank',
  name: 'Nubank',
  last4: '1234',
  closingDay: 24,
  dueDay: 1,
}

test('compra antes do fechamento entra na próxima data de vencimento correspondente', () => {
  expect(calculateInvoiceSchedule('2026-07-10', card)).toEqual({
    purchaseDate: '2026-07-10',
    closingDate: '2026-07-24',
    dueDate: '2026-08-01',
    invoiceMonth: '2026-08',
  })
})

test('compra após o fechamento vai para a fatura seguinte', () => {
  expect(calculateInvoiceSchedule('2026-07-25', card)).toEqual({
    purchaseDate: '2026-07-25',
    closingDate: '2026-08-24',
    dueDate: '2026-09-01',
    invoiceMonth: '2026-09',
  })
})

test('respeita vencimento no mesmo mês quando é posterior ao fechamento', () => {
  expect(
    calculateInvoiceSchedule('2026-07-01', {
      closingDay: 3,
      dueDay: 10,
    }),
  ).toMatchObject({
    closingDate: '2026-07-03',
    dueDate: '2026-07-10',
  })
})

test('divide centavos sem alterar o valor total', () => {
  const amounts = splitInstallmentAmounts(100, 3)
  expect(amounts).toEqual([33.34, 33.33, 33.33])
  expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBeCloseTo(100, 2)
})

test('cria transação simples com data contábil igual ao vencimento', () => {
  const transaction = buildCreditTransaction({
    baseData: {
      description: 'Mercado',
      categoryId: 'food',
    },
    totalAmount: 250,
    purchaseDate: '2026-07-10',
    card,
  })

  expect(transaction).toMatchObject({
    amount: 250,
    date: '2026-08-01',
    purchaseDate: '2026-07-10',
    invoiceMonth: '2026-08',
    cardId: 'nubank',
    isCreditPurchase: true,
  })
})

test('cria parcelas em faturas mensais consecutivas', () => {
  const items = buildInstallmentTransactions({
    baseData: {
      description: 'Notebook',
      categoryId: 'education',
    },
    totalAmount: 1200,
    installments: 3,
    purchaseDate: '2026-07-25',
    card,
    groupId: 'group-1',
  })

  expect(items).toHaveLength(3)
  expect(items.map((item) => item.date)).toEqual(['2026-09-01', '2026-10-01', '2026-11-01'])
  expect(items.map((item) => item.amount)).toEqual([400, 400, 400])
  expect(items[0]).toMatchObject({
    installmentNum: 1,
    installmentOf: 3,
    installmentGroupId: 'group-1',
    originalPurchaseDate: '2026-07-25',
  })
})
