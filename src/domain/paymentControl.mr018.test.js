import { describe, expect, test } from 'vitest'
import { buildCreditCardCenter } from './creditCardCenter'
import { summarizeTransactions, transactionsForMonth } from './finance'
import { buildPaymentControlOverview } from './paymentControl'

// Dataset 100% sintético: reconhecimento da compra ≠ obrigação ≠ liquidação.
const card = {
  id: 'card-mr018',
  name: 'Cartão de teste',
  closingDay: 20,
  dueDay: 10,
  active: true,
}

const purchase = ({ id, amount, invoiceMonth, dueDate, purchaseDate = '2026-10-21' }) => ({
  id,
  type: 'expense',
  amount,
  categoryId: 'test-consumption',
  cardId: card.id,
  paymentMethod: 'credit_card',
  isCreditPurchase: true,
  purchaseDate,
  date: dueDate,
  dueDate,
  invoiceMonth,
  paymentStatus: 'pending',
})

const invoicePayment = (id, amount, invoiceMonth = '2026-12') => ({
  id,
  type: 'payment',
  cardId: card.id,
  invoiceMonth,
  amount,
  eventDate: '2026-12-05',
  paymentDate: '2026-12-05',
})

const decemberOverview = (transactions, invoiceEvents = []) =>
  buildPaymentControlOverview({
    transactions,
    creditCards: [card],
    invoiceEvents,
    bounds: { start: '2026-12-01', end: '2026-12-31' },
    now: new Date(2026, 11, 5),
  })

describe('MR-018: atividade, obrigação e liquidação são grandezas distintas', () => {
  test('paridade Cartões e Controle de Pagamentos com centavos, ajuste e estorno', () => {
    const transactions = [
      purchase({
        id: 'parity-one',
        amount: 100.03,
        invoiceMonth: '2026-12',
        dueDate: '2026-12-10',
      }),
      purchase({
        id: 'parity-two',
        amount: 19.99,
        invoiceMonth: '2026-12',
        dueDate: '2026-12-10',
      }),
    ]
    const events = [
      {
        ...invoicePayment('parity-payment', 40.02),
        invoiceKey: 'card-mr018:2026-12',
      },
      {
        id: 'parity-reversal',
        type: 'reversal',
        invoiceKey: 'card-mr018:2026-12',
        cardId: card.id,
        invoiceMonth: '2026-12',
        reversesEventId: 'parity-payment',
        amount: 0.01,
        eventDate: '2026-12-06',
      },
      {
        id: 'parity-credit',
        type: 'adjustment',
        invoiceKey: 'card-mr018:2026-12',
        cardId: card.id,
        invoiceMonth: '2026-12',
        signedAmount: -0.02,
        eventDate: '2026-12-07',
      },
      {
        ...invoicePayment('other-month', 99, '2027-01'),
        invoiceKey: 'card-mr018:2027-01',
      },
    ]
    const now = new Date(2026, 11, 8)
    const center = buildCreditCardCenter({
      transactions,
      creditCards: [card],
      invoiceEvents: events,
      selectedMonth: '2026-12',
      now,
    })
    const control = buildPaymentControlOverview({
      transactions,
      creditCards: [card],
      invoiceEvents: events,
      bounds: { start: '2026-12-01', end: '2026-12-31' },
      now,
    })

    expect(center).toMatchObject({
      selectedPurchaseTotal: 120.02,
      selectedTotal: 120,
      selectedPaidTotal: 40.01,
      selectedRemainingTotal: 79.99,
    })
    expect(control.card).toMatchObject({
      totalAmount: center.selectedTotal,
      paidAmount: center.selectedPaidTotal,
      pendingAmount: center.selectedRemainingTotal,
      itemCount: 2,
      obligationCount: 1,
    })
    expect(control.committedAmount).toBe(center.selectedTotal)
    expect(summarizeTransactions(transactionsForMonth(transactions, 2026, 9)).expenses).toBe(
      120.02,
    )
    expect(summarizeTransactions(transactionsForMonth(transactions, 2026, 11)).expenses).toBe(0)
  })

  test('pagamento parcial altera pago/pendente da fatura, sem reconhecer nova despesa', () => {
    const transactions = [
      purchase({
        id: 'purchase-one',
        amount: 300.01,
        invoiceMonth: '2026-12',
        dueDate: '2026-12-10',
      }),
      purchase({
        id: 'purchase-two',
        amount: 199.99,
        invoiceMonth: '2026-12',
        dueDate: '2026-12-10',
      }),
      {
        id: 'manual-paid',
        type: 'expense',
        amount: 45,
        date: '2026-12-08',
        dueDate: '2026-12-08',
        paymentStatus: 'paid',
      },
    ]
    const payment = invoicePayment('pay-200-05', 200.05)

    expect(summarizeTransactions(transactionsForMonth(transactions, 2026, 9)).expenses).toBe(500)
    expect(summarizeTransactions(transactionsForMonth(transactions, 2026, 11)).expenses).toBe(45)

    expect(decemberOverview(transactions)).toMatchObject({
      committedAmount: 545,
      paidAmount: 45,
      pendingAmount: 500,
      totalCount: 2,
    })

    const afterPayment = decemberOverview(transactions, [payment])
    expect(afterPayment).toMatchObject({
      committedAmount: 545,
      paidAmount: 245.05,
      pendingAmount: 299.95,
      totalCount: 2,
      card: {
        totalAmount: 500,
        paidAmount: 200.05,
        pendingAmount: 299.95,
        obligationCount: 1,
        itemCount: 2,
      },
    })

    // invoiceEvents não são novos fatos de consumo em transactions.
    expect(summarizeTransactions(transactionsForMonth(transactions, 2026, 9)).expenses).toBe(500)
    expect(summarizeTransactions(transactionsForMonth(transactions, 2026, 11)).expenses).toBe(45)
  })

  test('estorno de pagamento restaura dívida, sem criar receita ou consumo', () => {
    const transactions = [
      purchase({
        id: 'purchase-reversal',
        amount: 500,
        invoiceMonth: '2026-12',
        dueDate: '2026-12-10',
      }),
    ]
    const payment = invoicePayment('pay-reversal', 200.05)
    const reversal = {
      id: 'reversal-50-01',
      type: 'reversal',
      reversesEventId: payment.id,
      cardId: card.id,
      invoiceMonth: '2026-12',
      amount: 50.01,
      eventDate: '2026-12-06',
    }

    const before = decemberOverview(transactions, [payment])
    const after = decemberOverview(transactions, [payment, reversal])

    expect(before.card).toMatchObject({
      totalAmount: 500,
      paidAmount: 200.05,
      pendingAmount: 299.95,
    })
    expect(after.card).toMatchObject({
      totalAmount: 500,
      paidAmount: 150.04,
      pendingAmount: 349.96,
    })
    expect(after).toMatchObject({
      committedAmount: 500,
      paidAmount: 150.04,
      pendingAmount: 349.96,
    })
    expect(summarizeTransactions(transactionsForMonth(transactions, 2026, 9))).toMatchObject({
      income: 0,
      expenses: 500,
    })
    expect(summarizeTransactions(transactionsForMonth(transactions, 2026, 11))).toMatchObject({
      income: 0,
      expenses: 0,
    })
  })

  test('quatro parcelas cruzando dezembro/janeiro reconhecem a compra uma vez', () => {
    const installments = [
      ['2026-12', '2026-12-10'],
      ['2027-01', '2027-01-10'],
      ['2027-02', '2027-02-10'],
      ['2027-03', '2027-03-10'],
    ].map(([invoiceMonth, dueDate], index) =>
      purchase({
        id: `installment-${index + 1}`,
        amount: 300,
        invoiceMonth,
        dueDate,
      }),
    )

    expect(summarizeTransactions(transactionsForMonth(installments, 2026, 9)).expenses).toBe(1200)
    expect(summarizeTransactions(transactionsForMonth(installments, 2026, 11)).expenses).toBe(0)
    expect(summarizeTransactions(transactionsForMonth(installments, 2027, 0)).expenses).toBe(0)

    const december = decemberOverview(installments, [invoicePayment('pay-dec', 100)])
    const january = buildPaymentControlOverview({
      transactions: installments,
      creditCards: [card],
      invoiceEvents: [invoicePayment('pay-dec', 100)],
      bounds: { start: '2027-01-01', end: '2027-01-31' },
      now: new Date(2027, 0, 5),
    })

    expect(december).toMatchObject({
      committedAmount: 300,
      paidAmount: 100,
      pendingAmount: 200,
      totalCount: 1,
    })
    expect(january).toMatchObject({
      committedAmount: 300,
      paidAmount: 0,
      pendingAmount: 300,
      totalCount: 1,
    })
  })
})
