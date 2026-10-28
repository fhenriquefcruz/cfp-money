import { expect, test } from 'vitest'
import { auditCreditCardFinancialParity } from './creditCardFinancialParity'

const now = new Date(2026, 9, 15)
const card = { id: 'card-a', name: 'Cartão A', last4: '1234', closingDay: 5, dueDay: 12 }
const purchase = (id, amount, fields = {}) => ({
  id,
  type: 'expense',
  paymentMethod: 'credit_card',
  cardId: 'card-a',
  invoiceMonth: '2026-10',
  date: '2026-10-12',
  amount,
  ...fields,
})
const check = (input = {}) =>
  auditCreditCardFinancialParity({
    creditCards: [card],
    selectedMonth: '2026-10',
    now,
    ...input,
  })

test('concilia total, pago, saldo e parcelas futuras por competência em centavos', () => {
  const data = check({
    transactions: [
      purchase('one', 100.1, { paymentStatus: 'paid' }),
      purchase('two', 20.2, { paymentStatus: 'pending' }),
      purchase('installment-next', 33.3, {
        invoiceMonth: '2026-11',
        isInstallment: true,
        installmentNum: 2,
        installmentOf: 3,
      }),
    ],
  })
  expect(data).toMatchObject({
    readOnly: true,
    status: 'ok',
    counts: { saved: 3, unlinked: 0, historical: 0, invoices: 1 },
    totals: {
      sourceSavedPurchases: 120.3,
      displayedPurchases: 120.3,
      previewDelta: 0,
      invoiceTotal: 120.3,
      paidTotal: 100.1,
      remainingTotal: 20.2,
      creditTotal: 0,
      futureInstallments: 33.3,
    },
  })
  expect(data.findings).toEqual([])
})

test('evento de pagamento e estorno prevalece, sem somar status pago da transação', () => {
  const data = check({
    transactions: [purchase('paid', 300, { paymentStatus: 'paid' })],
    invoiceEvents: [
      { id: 'pay', type: 'payment', cardId: 'card-a', invoiceMonth: '2026-10', amount: 100 },
      {
        id: 'undo',
        type: 'reversal',
        reversesEventId: 'pay',
        cardId: 'card-a',
        invoiceMonth: '2026-10',
        amount: 20,
      },
    ],
  })
  expect(data.totals).toMatchObject({
    invoiceTotal: 300,
    paidTotal: 80,
    remainingTotal: 220,
  })
  expect(data.invoices[0].paymentSource).toBe('invoice_events')
  expect(data.findings.map((item) => item.code)).toEqual(['mixed_payment_sources'])
  expect(data.status).toBe('review')
})

test('alerta estorno sem pagamento correspondente, mantendo valor do motor como está', () => {
  const data = check({
    transactions: [purchase('purchase', 100)],
    invoiceEvents: [
      {
        id: 'orphan',
        type: 'reversal',
        reversesEventId: 'absent',
        cardId: 'card-a',
        invoiceMonth: '2026-10',
        amount: 40,
      },
    ],
  })
  expect(data.findings.some((item) => item.code === 'unmatched_payment_reversal')).toBe(true)
  expect(data.totals.remainingTotal).toBe(100)
  expect(data.status).toBe('review')
})

test('separa sugestões de cartão na memória de vínculos realmente salvos', () => {
  const tx = {
    id: 'old',
    type: 'expense',
    paymentMethod: 'credit_card',
    cardName: 'Cartão A',
    amount: 45.67,
    date: '2026-10-01',
    purchaseDate: '2026-10-01',
  }
  const data = check({ transactions: [tx] })
  expect(data.counts).toMatchObject({ saved: 0, unlinked: 1, previewMatches: 1 })
  expect(data.totals.sourceSavedPurchases).toBe(0)
  expect(data.totals.displayedPurchases).toBe(45.67)
  expect(data.totals.previewDelta).toBe(45.67)
  expect(data.findings.map((item) => item.code)).toEqual([
    'unlinked_credit_purchases',
    'unsaved_card_match_preview',
  ])
  expect(tx.cardId).toBeUndefined()
})

test('preserva cartão removido e não o considera automaticamente um erro', () => {
  const data = check({
    transactions: [
      purchase('historical', 25.01, {
        cardId: 'deleted',
        cardName: 'Cartão antigo',
        cardClosingDay: 5,
        cardDueDay: 12,
      }),
    ],
  })
  expect(data.counts).toMatchObject({ saved: 1, historical: 1 })
  expect(data.totals).toMatchObject({
    sourceSavedPurchases: 25.01,
    displayedPurchases: 25.01,
    previewDelta: 0,
  })
  expect(data.invoices.some((invoice) => invoice.historicalOnly)).toBe(true)
  expect(data.status).toBe('ok')
  expect(data.findings[0].code).toBe('historical_card_references')
})

test('sinaliza duplicidades, competências inválidas e valores ilegíveis sem escrita', () => {
  const transactions = Object.freeze([
    Object.freeze(purchase('same', 10)),
    Object.freeze(purchase('same', 20)),
    Object.freeze(purchase('bad-month', 12, { invoiceMonth: '2026-13' })),
    Object.freeze(purchase('bad-amount', 'incorrect')),
    Object.freeze({ id: 'salary', type: 'income', cardId: 'card-a', amount: 1000 }),
    Object.freeze(purchase('cancelled', 999, { paymentStatus: 'cancelled' })),
  ])
  const previous = JSON.stringify(transactions)
  const data = check({ transactions, creditCards: Object.freeze([Object.freeze(card)]) })
  expect(data.status).toBe('critical')
  expect(data.findings.map((item) => item.code).sort()).toEqual([
    'duplicate_transaction_id',
    'invalid_invoice_month',
    'invalid_purchase_amount',
  ])
  expect(data.totals.invoiceTotal).toBe(30)
  expect(JSON.stringify(transactions)).toBe(previous)
})

test('calcula pagamentos superiores à fatura como crédito, sem saldo negativo', () => {
  const data = check({
    transactions: [purchase('overpay', 100)],
    invoiceEvents: [
      { id: 'over', type: 'payment', cardId: 'card-a', invoiceMonth: '2026-10', amount: 150 },
    ],
  })
  expect(data.totals).toMatchObject({
    invoiceTotal: 100,
    paidTotal: 150,
    remainingTotal: 0,
    creditTotal: 50,
  })
  expect(data.status).toBe('ok')
})

test('mantém auditoria íntegra com dados ausentes sem inferir compras fictícias', () => {
  const result = check({ transactions: [], creditCards: [], invoiceEvents: [] })
  expect(result.readOnly).toBe(true)
  expect(result.status).toBe('ok')
  expect(result.findings).toEqual([])
  expect(result.totals).toMatchObject({
    sourceSavedPurchases: 0,
    displayedPurchases: 0,
    paidTotal: 0,
    remainingTotal: 0,
  })
})

test('detecta cartões sem ID no backup e cadastros com ID duplicado', () => {
  const result = check({
    creditCards: [{ name: 'Antigo' }, { id: null, name: 'Outro' }, card, { ...card }],
    transactions: [],
  })
  expect(result.status).toBe('critical')
  expect(result.findings.filter((item) => item.code === 'missing_card_registration_id')).toHaveLength(2)
  expect(result.findings.filter((item) => item.code === 'duplicate_card_registration_id')).toHaveLength(1)
})
