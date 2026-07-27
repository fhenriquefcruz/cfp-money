import {
  buildCreditCardCenter,
  invoiceDatesForMonth,
  invoiceStatus,
  labelForMonth,
  shiftMonthKey,
} from './creditCardCenter'

const cards = [
  {
    id: 'nubank',
    name: 'Nubank',
    last4: '1234',
    closingDay: 24,
    dueDay: 1,
    active: true,
  },
  {
    id: 'inter',
    name: 'Inter',
    last4: '9876',
    closingDay: 10,
    dueDay: 17,
    active: true,
  },
]

const transactions = [
  {
    id: 'tx-1',
    type: 'expense',
    paymentMethod: 'credit_card',
    isCreditPurchase: true,
    cardId: 'nubank',
    cardName: 'Nubank',
    amount: 200,
    invoiceMonth: '2026-08',
    date: '2026-08-01',
    purchaseDate: '2026-07-10',
    categoryName: 'Alimentação',
  },
  {
    id: 'tx-2',
    type: 'expense',
    paymentMethod: 'credit_card',
    isCreditPurchase: true,
    isInstallment: true,
    installmentNum: 1,
    installmentOf: 3,
    cardId: 'inter',
    cardName: 'Inter',
    amount: 100,
    invoiceMonth: '2026-08',
    date: '2026-08-17',
    purchaseDate: '2026-07-20',
    categoryName: 'Educação',
  },
  {
    id: 'tx-3',
    type: 'expense',
    paymentMethod: 'credit_card',
    isCreditPurchase: true,
    isInstallment: true,
    installmentNum: 2,
    installmentOf: 3,
    cardId: 'inter',
    cardName: 'Inter',
    amount: 100,
    invoiceMonth: '2026-09',
    date: '2026-09-17',
    purchaseDate: '2026-07-20',
    categoryName: 'Educação',
  },
  {
    id: 'legacy',
    type: 'expense',
    paymentMethod: 'credit_card',
    amount: 50,
    date: '2026-08-05',
  },
]

test('calcula fechamento anterior quando o vencimento vem antes do fechamento', () => {
  expect(invoiceDatesForMonth('2026-08', cards[0])).toEqual({
    closingDate: '2026-07-24',
    dueDate: '2026-08-01',
  })
})

test('mantém fechamento no mesmo mês quando o vencimento vem depois', () => {
  expect(invoiceDatesForMonth('2026-08', cards[1])).toEqual({
    closingDate: '2026-08-10',
    dueDate: '2026-08-17',
  })
})

test('consolida a fatura por cartão sem incluir transação antiga manual', () => {
  const center = buildCreditCardCenter({
    transactions,
    creditCards: cards,
    selectedMonth: '2026-08',
    now: new Date(2026, 6, 20),
  })

  expect(center.selectedTotal).toBe(300)
  expect(center.selectedItemCount).toBe(2)
  expect(center.cardsWithTransactions).toBe(2)
  expect(center.legacyCount).toBe(1)
  expect(center.legacyTotal).toBe(50)
})

test('calcula parcelas futuras e previsão mensal', () => {
  const center = buildCreditCardCenter({
    transactions,
    creditCards: cards,
    selectedMonth: '2026-08',
    now: new Date(2026, 6, 20),
    forecastMonths: 3,
  })

  expect(center.futureInstallmentCount).toBe(1)
  expect(center.futureInstallmentTotal).toBe(100)
  expect(center.forecast.map((item) => item.total)).toEqual([300, 100, 0])
})

test('preserva cartão removido a partir do retrato salvo na transação', () => {
  const center = buildCreditCardCenter({
    transactions: [
      {
        type: 'expense',
        paymentMethod: 'credit_card',
        isCreditPurchase: true,
        cardId: 'deleted',
        cardName: 'Cartão antigo',
        cardLast4: '4455',
        cardClosingDay: 8,
        cardDueDay: 15,
        amount: 80,
        invoiceMonth: '2026-08',
        date: '2026-08-15',
      },
    ],
    creditCards: [],
    selectedMonth: '2026-08',
  })

  expect(center.cards[0]).toMatchObject({
    id: 'deleted',
    name: 'Cartão antigo',
    last4: '4455',
    historicalOnly: true,
  })
})

test('expõe estado temporal sem afirmar que a fatura foi paga', () => {
  expect(
    invoiceStatus('2026-08', cards[1], new Date(2026, 7, 12)),
  ).toBe('closed')
  expect(
    invoiceStatus('2026-08', cards[1], new Date(2026, 7, 20)),
  ).toBe('past_due')
  expect(
    invoiceStatus('2026-09', cards[1], new Date(2026, 7, 20)),
  ).toBe('future')
})

test('navega e rotula meses em português', () => {
  expect(shiftMonthKey('2026-12', 1)).toBe('2027-01')
  expect(labelForMonth('2026-08')).toBe('Agosto de 2026')
})
