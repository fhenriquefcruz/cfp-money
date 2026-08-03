import { describe, expect, test } from 'vitest'
import {
  buildPaymentControlOverview,
  buildPaymentStatusIndex,
  canToggleTransactionPayment,
  createPaymentPersistenceChange,
  createPaymentStatusChange,
  getTransactionPaymentState,
  getTransactionPaymentStatus,
  isTransactionPaid,
  summarizePaymentControl,
} from './paymentControl'

const expense = (overrides = {}) => ({
  id: 'expense-1',
  type: 'expense',
  amount: 100,
  date: '2026-08-03',
  ...overrides,
})

const card = {
  id: 'nubank',
  name: 'Nubank',
  closingDay: 1,
  dueDay: 10,
  active: true,
}

const cardExpense = (overrides = {}) =>
  expense({
    id: 'card-expense',
    amount: 300,
    paymentMethod: 'credit_card',
    isCreditPurchase: true,
    cardId: card.id,
    cardName: card.name,
    invoiceMonth: '2026-08',
    dueDate: '2026-08-10',
    date: '2026-08-10',
    ...overrides,
  })

describe('controle de pagamentos', () => {
  test('trata despesa antiga sem status como pendente', () => {
    expect(getTransactionPaymentStatus(expense())).toBe('pending')
    expect(isTransactionPaid(expense())).toBe(false)
  })

  test('marca uma despesa como paga com data e hora', () => {
    const change = createPaymentStatusChange(true, new Date('2026-08-03T12:30:00.000Z'))

    expect(change).toEqual({
      paymentStatus: 'paid',
      paidAt: '2026-08-03T12:30:00.000Z',
    })
    expect(isTransactionPaid({ ...expense(), ...change })).toBe(true)
  })

  test('gera a alteração persistida sem duplicar a regra de status', () => {
    const timestamp = { seconds: 123 }

    expect(createPaymentPersistenceChange(true, timestamp)).toEqual({
      paymentStatus: 'paid',
      paidAt: timestamp,
    })
    expect(createPaymentPersistenceChange(false, timestamp)).toEqual({
      paymentStatus: 'pending',
      paidAt: null,
    })
  })

  test('retorna uma despesa paga para pendente e remove a data', () => {
    expect(createPaymentStatusChange(false)).toEqual({
      paymentStatus: 'pending',
      paidAt: null,
    })
    expect(getTransactionPaymentStatus({ isPaid: true, paymentStatus: 'pending' })).toBe('pending')
  })

  test('calcula totais pagos, pendentes e o progresso por valor', () => {
    const summary = summarizePaymentControl([
      expense({ id: 'paid', amount: 250, paymentStatus: 'paid' }),
      expense({ id: 'pending', amount: 150 }),
      { id: 'income', type: 'income', amount: 900, date: '2026-08-03' },
    ])

    expect(summary).toEqual({
      totalAmount: 400,
      paidAmount: 250,
      pendingAmount: 150,
      totalCount: 2,
      paidCount: 1,
      pendingCount: 1,
      progress: 62.5,
    })
  })

  test('considera cada parcela como uma unidade independente', () => {
    const summary = summarizePaymentControl([
      expense({
        id: 'installment-1',
        amount: 200,
        paymentMethod: 'credit_card',
        isInstallment: true,
        installmentNum: 1,
        paymentStatus: 'paid',
      }),
      expense({
        id: 'installment-2',
        amount: 200,
        paymentMethod: 'credit_card',
        isInstallment: true,
        installmentNum: 2,
      }),
    ])

    expect(summary.paidCount).toBe(1)
    expect(summary.pendingCount).toBe(1)
    expect(summary.paidAmount).toBe(200)
  })

  test('não propaga pagamento para ocorrências recorrentes futuras', () => {
    const summary = summarizePaymentControl(
      [
        expense({
          id: 'rent-aug',
          amount: 800,
          isRecurring: true,
          recurringNum: 1,
          paymentStatus: 'paid',
        }),
        expense({
          id: 'rent-sep',
          amount: 800,
          date: '2026-09-03',
          isRecurring: true,
          recurringNum: 2,
        }),
      ],
      { start: '2026-08-01', end: '2026-08-31' },
    )

    expect(summary.totalCount).toBe(1)
    expect(summary.paidCount).toBe(1)
    expect(getTransactionPaymentStatus(expense({ date: '2026-09-03', isRecurring: true }))).toBe(
      'pending',
    )
  })

  test('usa a fatura como fonte de verdade para cartão estruturado', () => {
    const transaction = cardExpense({ paymentStatus: 'paid' })
    const statusIndex = buildPaymentStatusIndex({
      transactions: [transaction],
      creditCards: [card],
      now: new Date(2026, 7, 5),
    })

    expect(canToggleTransactionPayment(transaction)).toBe(false)
    expect(getTransactionPaymentState(transaction, statusIndex)).toMatchObject({
      status: 'pending',
      source: 'invoice',
      detail: 'pending',
    })
  })

  test('integra pagamento integral da fatura ao resumo mensal', () => {
    const summary = buildPaymentControlOverview({
      transactions: [cardExpense()],
      creditCards: [card],
      invoiceEvents: [
        {
          id: 'payment-1',
          type: 'payment',
          cardId: card.id,
          invoiceMonth: '2026-08',
          amount: 300,
        },
      ],
      bounds: { start: '2026-08-01', end: '2026-08-31' },
      now: new Date(2026, 7, 5),
    })

    expect(summary).toMatchObject({
      totalAmount: 300,
      paidAmount: 300,
      pendingAmount: 0,
      totalCount: 1,
      paidCount: 1,
      pendingCount: 0,
      progress: 100,
    })
  })

  test('considera pagamento parcial sem marcar as compras da fatura como pagas', () => {
    const transaction = cardExpense()
    const invoiceEvents = [
      {
        id: 'payment-1',
        type: 'payment',
        cardId: card.id,
        invoiceMonth: '2026-08',
        amount: 100,
      },
    ]
    const statusIndex = buildPaymentStatusIndex({
      transactions: [transaction],
      creditCards: [card],
      invoiceEvents,
      now: new Date(2026, 7, 5),
    })
    const summary = buildPaymentControlOverview({
      transactions: [transaction],
      creditCards: [card],
      invoiceEvents,
      bounds: { start: '2026-08-01', end: '2026-08-31' },
      now: new Date(2026, 7, 5),
    })

    expect(getTransactionPaymentState(transaction, statusIndex)).toMatchObject({
      status: 'pending',
      detail: 'partial',
    })
    expect(summary.paidAmount).toBe(100)
    expect(summary.pendingAmount).toBe(200)
    expect(summary.paidCount).toBe(0)
    expect(summary.pendingCount).toBe(1)
  })
})
