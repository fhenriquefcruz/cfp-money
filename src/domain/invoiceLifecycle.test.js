import {
  buildInvoiceKey,
  buildInvoiceLifecycle,
  createAdjustmentEvent,
  createManualCloseEvent,
  createPaymentEvent,
  createReversalEvent,
  getInvoiceEvents,
  getPaymentReversibleAmount,
} from './invoiceLifecycle'

const card = {
  id: 'nubank',
  name: 'Nubank',
  last4: '1234',
}

test('cria chave estável da fatura', () => {
  expect(buildInvoiceKey('nubank', '2026-08')).toBe('nubank:2026-08')
})

test('calcula pagamento parcial e saldo pendente', () => {
  const lifecycle = buildInvoiceLifecycle({
    purchaseTotal: 300,
    dueDate: '2026-08-10',
    closingDate: '2026-08-01',
    temporalStatus: 'closed',
    now: new Date(2026, 7, 5),
    events: [
      {
        id: 'pay-1',
        type: 'payment',
        amount: 100,
      },
    ],
  })

  expect(lifecycle).toMatchObject({
    invoiceTotal: 300,
    paidAmount: 100,
    remainingAmount: 200,
    status: 'partially_paid',
  })
})

test('identifica fatura integralmente paga', () => {
  const lifecycle = buildInvoiceLifecycle({
    purchaseTotal: 300,
    dueDate: '2026-08-10',
    now: new Date(2026, 7, 5),
    events: [
      {
        id: 'pay-1',
        type: 'payment',
        amount: 300,
      },
    ],
  })

  expect(lifecycle.status).toBe('paid')
  expect(lifecycle.remainingAmount).toBe(0)
})

test('identifica atraso real e atraso parcial', () => {
  expect(
    buildInvoiceLifecycle({
      purchaseTotal: 300,
      dueDate: '2026-08-10',
      now: new Date(2026, 7, 20),
      events: [],
    }).status,
  ).toBe('overdue')

  expect(
    buildInvoiceLifecycle({
      purchaseTotal: 300,
      dueDate: '2026-08-10',
      now: new Date(2026, 7, 20),
      events: [
        {
          type: 'payment',
          amount: 100,
        },
      ],
    }).status,
  ).toBe('overdue_partial')
})

test('aplica crédito e acréscimo ao total da fatura', () => {
  const lifecycle = buildInvoiceLifecycle({
    purchaseTotal: 300,
    events: [
      {
        type: 'adjustment',
        signedAmount: -50,
      },
      {
        type: 'adjustment',
        signedAmount: 10,
      },
    ],
  })

  expect(lifecycle.adjustmentTotal).toBe(-40)
  expect(lifecycle.invoiceTotal).toBe(260)
})

test('estorno reduz o valor pago sem apagar o pagamento', () => {
  const payment = {
    id: 'pay-1',
    type: 'payment',
    amount: 300,
    sourceAccount: 'Banco',
  }
  const reversal = createReversalEvent({
    card,
    invoiceMonth: '2026-08',
    payment,
    invoiceEvents: [payment],
    eventDate: '2026-08-06',
  })

  const lifecycle = buildInvoiceLifecycle({
    purchaseTotal: 300,
    events: [payment, reversal],
  })

  expect(reversal).toMatchObject({
    type: 'reversal',
    amount: 300,
    reversesEventId: 'pay-1',
  })
  expect(lifecycle.paidAmount).toBe(0)
  expect(getPaymentReversibleAmount(payment, [payment, reversal])).toBe(0)
})

test('cria eventos validados', () => {
  expect(
    createPaymentEvent({
      card,
      invoiceMonth: '2026-08',
      amount: 150,
      paymentDate: '2026-08-05',
      sourceAccount: 'Banco do Brasil',
    }),
  ).toMatchObject({
    type: 'payment',
    invoiceKey: 'nubank:2026-08',
    amount: 150,
  })

  expect(
    createAdjustmentEvent({
      card,
      invoiceMonth: '2026-08',
      amount: 20,
      direction: 'credit',
      eventDate: '2026-08-05',
      notes: 'Crédito promocional',
    }).signedAmount,
  ).toBe(-20)

  expect(
    createManualCloseEvent({
      card,
      invoiceMonth: '2026-08',
      eventDate: '2026-08-01',
    }).type,
  ).toBe('manual_close')
})

test('filtra eventos da fatura correta', () => {
  const events = [
    {
      id: 'a',
      invoiceKey: 'nubank:2026-08',
      eventDate: '2026-08-05',
    },
    {
      id: 'b',
      invoiceKey: 'nubank:2026-09',
      eventDate: '2026-09-05',
    },
  ]

  expect(getInvoiceEvents(events, 'nubank', '2026-08')).toEqual([events[0]])
})
