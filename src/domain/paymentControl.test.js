import { describe, expect, test } from 'vitest'
import {
  buildPaymentBulkOperation,
  buildPaymentControlOverview,
  buildPaymentStatusIndex,
  buildPaymentUndoOperation,
  canToggleTransactionPayment,
  createPaymentPersistenceChange,
  createPaymentStatusChange,
  ensureTransactionPaymentDefaults,
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
  test('trata despesa antiga sem status como desconhecida', () => {
    expect(getTransactionPaymentStatus(expense())).toBe('unknown')
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
      expense({ id: 'pending', amount: 150, paymentStatus: 'pending' }),
      { id: 'income', type: 'income', amount: 900, date: '2026-08-03' },
    ])

    expect(summary).toEqual({
      totalAmount: 400,
      paidAmount: 250,
      pendingAmount: 150,
      overdueAmount: 0,
      unknownAmount: 0,
      totalCount: 2,
      paidCount: 1,
      pendingCount: 1,
      overdueCount: 0,
      unknownCount: 0,
      progress: 62.5,
    })
  })

  test('separa legado desconhecido de dívida pendente', () => {
    const summary = summarizePaymentControl([
      expense({ id: 'unknown', amount: 300 }),
      expense({ id: 'pending', amount: 200, paymentStatus: 'pending' }),
      expense({ id: 'paid', amount: 100, paymentStatus: 'paid' }),
    ])

    expect(summary).toMatchObject({
      totalAmount: 600,
      paidAmount: 100,
      pendingAmount: 200,
      unknownAmount: 300,
      paidCount: 1,
      pendingCount: 1,
      unknownCount: 1,
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
        paymentStatus: 'pending',
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
      'unknown',
    )
  })

  test('marca pendência manual vencida como atrasada somente com dueDate explícita', () => {
    const transaction = expense({
      paymentStatus: 'pending',
      dueDate: '2026-08-05',
    })

    expect(getTransactionPaymentStatus(transaction, new Date(2026, 7, 9))).toBe('overdue')
  })

  test('não transforma legado desconhecido em atraso automaticamente', () => {
    const transaction = expense({
      dueDate: '2026-08-05',
    })

    expect(getTransactionPaymentStatus(transaction, new Date(2026, 7, 9))).toBe('unknown')
  })

  test('não permite alternar pagamento de despesa cancelada', () => {
    expect(
      canToggleTransactionPayment(
        expense({
          paymentStatus: 'cancelled',
        }),
      ),
    ).toBe(false)
  })

  test('exclui despesas canceladas dos totais financeiros', () => {
    const summary = summarizePaymentControl([
      expense({ id: 'paid', amount: 100, paymentStatus: 'paid' }),
      expense({ id: 'pending', amount: 200, paymentStatus: 'pending' }),
      expense({ id: 'cancelled', amount: 900, paymentStatus: 'cancelled' }),
    ])

    expect(summary.totalAmount).toBe(300)
    expect(summary.totalCount).toBe(2)
    expect(summary.paidAmount).toBe(100)
    expect(summary.pendingAmount).toBe(200)
  })

  test('usa o lifecycle da fatura para identificar cartão vencido', () => {
    const transaction = cardExpense()
    const statusIndex = buildPaymentStatusIndex({
      transactions: [transaction],
      creditCards: [card],
      now: new Date(2026, 7, 11),
    })

    expect(getTransactionPaymentState(transaction, statusIndex)).toMatchObject({
      status: 'overdue',
      source: 'invoice',
      detail: 'overdue',
    })
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

  test('overview respeita o now informado para atraso manual', () => {
    const summary = buildPaymentControlOverview({
      transactions: [
        expense({
          id: 'manual-overdue',
          amount: 200,
          date: '2026-09-05',
          dueDate: '2026-09-05',
          paymentStatus: 'pending',
        }),
      ],
      bounds: { start: '2026-09-01', end: '2026-09-30' },
      now: new Date(2026, 8, 10),
    })

    expect(summary).toMatchObject({
      totalAmount: 200,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 200,
      totalCount: 1,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 1,
    })
  })

  test('overview separa fatura vencida de simples pendência', () => {
    const summary = buildPaymentControlOverview({
      transactions: [cardExpense()],
      creditCards: [card],
      bounds: { start: '2026-08-01', end: '2026-08-31' },
      now: new Date(2026, 7, 11),
    })

    expect(summary).toMatchObject({
      totalAmount: 300,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 300,
      totalCount: 1,
      pendingCount: 0,
      overdueCount: 1,
    })
  })

  test('overview mantém pagamento parcial e saldo vencido sem dupla contagem', () => {
    const summary = buildPaymentControlOverview({
      transactions: [cardExpense()],
      creditCards: [card],
      invoiceEvents: [
        {
          id: 'payment-overdue-partial',
          type: 'payment',
          cardId: card.id,
          invoiceMonth: '2026-08',
          amount: 100,
        },
      ],
      bounds: { start: '2026-08-01', end: '2026-08-31' },
      now: new Date(2026, 7, 11),
    })

    expect(summary).toMatchObject({
      totalAmount: 300,
      paidAmount: 100,
      pendingAmount: 0,
      overdueAmount: 200,
      totalCount: 1,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 1,
    })
  })

  test('overview conta uma fatura como uma obrigação, não cada compra', () => {
    const summary = buildPaymentControlOverview({
      transactions: [
        cardExpense({ id: 'purchase-1', amount: 100 }),
        cardExpense({ id: 'purchase-2', amount: 200 }),
      ],
      creditCards: [card],
      bounds: { start: '2026-08-01', end: '2026-08-31' },
      now: new Date(2026, 7, 5),
    })

    expect(summary).toMatchObject({
      totalAmount: 300,
      pendingAmount: 300,
      totalCount: 1,
      paidCount: 0,
      pendingCount: 1,
      overdueCount: 0,
    })

    expect(summary.card.itemCount).toBe(2)
    expect(summary.card.obligationCount).toBe(1)
  })

  test('overview calcula comprometido, a pagar e próximos 7 dias sem incluir desconhecidos', () => {
    const summary = buildPaymentControlOverview({
      transactions: [
        expense({
          id: 'paid',
          amount: 100,
          paymentStatus: 'paid',
          dueDate: '2026-08-07',
        }),
        expense({
          id: 'soon',
          amount: 200,
          paymentStatus: 'pending',
          dueDate: '2026-08-09',
        }),
        expense({
          id: 'later',
          amount: 300,
          paymentStatus: 'pending',
          dueDate: '2026-08-20',
        }),
        expense({
          id: 'overdue',
          amount: 400,
          paymentStatus: 'pending',
          dueDate: '2026-08-01',
        }),
        expense({
          id: 'unknown',
          amount: 500,
          dueDate: '2026-08-09',
        }),
        expense({
          id: 'cancelled',
          amount: 900,
          paymentStatus: 'cancelled',
          dueDate: '2026-08-09',
        }),
      ],
      bounds: { start: '2026-08-01', end: '2026-08-31' },
      now: new Date(2026, 7, 5),
    })

    expect(summary).toMatchObject({
      totalAmount: 1500,
      committedAmount: 1500,
      paidAmount: 100,
      pendingAmount: 500,
      overdueAmount: 400,
      unknownAmount: 500,
      toPayAmount: 900,
      dueNext7DaysAmount: 200,
      toPayCount: 3,
      dueNext7DaysCount: 1,
    })
  })

  test('overview inclui saldo da fatura a vencer nos próximos 7 dias', () => {
    const summary = buildPaymentControlOverview({
      transactions: [cardExpense()],
      creditCards: [card],
      bounds: { start: '2026-08-01', end: '2026-08-31' },
      now: new Date(2026, 7, 5),
    })

    expect(summary).toMatchObject({
      committedAmount: 300,
      toPayAmount: 300,
      dueNext7DaysAmount: 300,
      toPayCount: 1,
      dueNext7DaysCount: 1,
    })

    expect(summary.card).toMatchObject({
      pendingAmount: 300,
      dueNext7DaysAmount: 300,
    })
  })

  test('overview considera apenas o saldo restante da fatura parcial nos próximos 7 dias', () => {
    const summary = buildPaymentControlOverview({
      transactions: [cardExpense()],
      creditCards: [card],
      invoiceEvents: [
        {
          id: 'payment-partial-upcoming',
          type: 'payment',
          cardId: card.id,
          invoiceMonth: '2026-08',
          amount: 100,
        },
      ],
      bounds: { start: '2026-08-01', end: '2026-08-31' },
      now: new Date(2026, 7, 5),
    })

    expect(summary).toMatchObject({
      committedAmount: 300,
      paidAmount: 100,
      toPayAmount: 200,
      dueNext7DaysAmount: 200,
      toPayCount: 1,
      dueNext7DaysCount: 1,
    })
  })

  test('overview compara o comprometido com o mês anterior', () => {
    const summary = buildPaymentControlOverview({
      transactions: [
        expense({
          id: 'current',
          amount: 600,
          date: '2026-08-20',
          dueDate: '2026-08-20',
          paymentStatus: 'pending',
        }),
        expense({
          id: 'previous',
          amount: 400,
          date: '2026-07-20',
          dueDate: '2026-07-20',
          paymentStatus: 'pending',
        }),
      ],
      bounds: { start: '2026-08-01', end: '2026-08-31' },
      now: new Date(2026, 7, 5),
    })

    expect(summary.comparison).toEqual({
      previousCommittedAmount: 400,
      committedDeltaAmount: 200,
      committedDeltaPercent: 50,
    })
  })

  test('overview evita percentual artificial quando o mês anterior é zero', () => {
    const summary = buildPaymentControlOverview({
      transactions: [
        expense({
          id: 'current-only',
          amount: 300,
          date: '2026-08-20',
          dueDate: '2026-08-20',
          paymentStatus: 'pending',
        }),
      ],
      bounds: { start: '2026-08-01', end: '2026-08-31' },
      now: new Date(2026, 7, 5),
    })

    expect(summary.comparison).toEqual({
      previousCommittedAmount: 0,
      committedDeltaAmount: 300,
      committedDeltaPercent: null,
    })
  })

  test('overview distribui obrigações conhecidas por semana de vencimento', () => {
    const summary = buildPaymentControlOverview({
      transactions: [
        expense({
          id: 'overdue-week-1',
          amount: 400,
          date: '2026-08-01',
          dueDate: '2026-08-01',
          paymentStatus: 'pending',
        }),
        expense({
          id: 'pending-week-2',
          amount: 200,
          date: '2026-08-09',
          dueDate: '2026-08-09',
          paymentStatus: 'pending',
        }),
        expense({
          id: 'unknown-week-2',
          amount: 900,
          date: '2026-08-09',
          dueDate: '2026-08-09',
        }),
        cardExpense({
          id: 'card-week-2',
          amount: 300,
        }),
      ],
      creditCards: [card],
      bounds: { start: '2026-08-01', end: '2026-08-31' },
      now: new Date(2026, 7, 5),
    })

    expect(summary.weekly.slice(0, 2)).toEqual([
      {
        start: '2026-08-01',
        end: '2026-08-07',
        toPayAmount: 400,
        toPayCount: 1,
      },
      {
        start: '2026-08-08',
        end: '2026-08-14',
        toPayAmount: 500,
        toPayCount: 2,
      },
    ])
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
      status: 'partial',
      detail: 'partial',
    })
    expect(summary.paidAmount).toBe(100)
    expect(summary.pendingAmount).toBe(200)
    expect(summary.paidCount).toBe(0)
    expect(summary.pendingCount).toBe(1)
  })

  test('novas despesas manuais recebem pendência explícita sem alterar cartão estruturado', () => {
    const manual = ensureTransactionPaymentDefaults(
      expense({
        paymentStatus: undefined,
        isPaid: undefined,
      }),
    )

    expect(manual).toMatchObject({
      paymentStatus: 'pending',
      isPaid: false,
      paidAt: null,
    })

    const structured = cardExpense({
      paymentStatus: undefined,
      isPaid: undefined,
    })

    const preparedCard = ensureTransactionPaymentDefaults(structured)

    expect(preparedCard.paymentStatus).toBeUndefined()
    expect(preparedCard.isPaid).toBeUndefined()
  })

  test('ação em massa revisa legado sem atingir cartão ou cancelada', () => {
    const operation = buildPaymentBulkOperation(
      [
        expense({ id: 'legacy' }),
        expense({
          id: 'pending',
          paymentStatus: 'pending',
        }),
        cardExpense({ id: 'card' }),
        expense({
          id: 'cancelled',
          paymentStatus: 'cancelled',
        }),
      ],
      'paid',
      new Date(2026, 7, 9, 12, 0, 0),
    )

    expect(operation.changes.map((change) => change.id)).toEqual(['legacy', 'pending'])

    expect(operation.changes[0]).toMatchObject({
      beforeStatus: 'unknown',
      toStatus: 'paid',
      data: {
        paymentStatus: 'paid',
        isPaid: true,
      },
    })

    expect(operation.changes[0].data.paymentAudit.at(-1)).toMatchObject({
      action: 'payment_status_change',
      fromStatus: 'unknown',
      toStatus: 'paid',
    })
  })

  test('undo da ação em massa restaura o estado anterior', () => {
    const operation = buildPaymentBulkOperation(
      [
        expense({ id: 'legacy' }),
        expense({
          id: 'pending',
          paymentStatus: 'pending',
        }),
      ],
      'paid',
      new Date(2026, 7, 9, 12, 0, 0),
    )

    const undo = buildPaymentUndoOperation(operation, new Date(2026, 7, 9, 12, 5, 0))

    expect(undo.kind).toBe('undo')
    expect(undo.changes).toHaveLength(2)

    expect(undo.changes[0]).toMatchObject({
      id: 'legacy',
      toStatus: 'unknown',
      data: {
        paymentStatus: 'unknown',
        isPaid: false,
      },
    })

    expect(undo.changes[1]).toMatchObject({
      id: 'pending',
      toStatus: 'pending',
      data: {
        paymentStatus: 'pending',
        isPaid: false,
      },
    })

    expect(undo.changes[0].data.paymentAudit.at(-1).action).toBe('payment_status_undo')
  })

  test('auditoria de pagamento mantém somente os 20 registros mais recentes', () => {
    const history = Array.from({ length: 25 }, (_, index) => ({
      operationId: `old-${index}`,
      action: 'payment_status_change',
      changedAt: '2026-08-01T00:00:00.000Z',
    }))

    const operation = buildPaymentBulkOperation(
      [
        expense({
          id: 'with-history',
          paymentAudit: history,
        }),
      ],
      'paid',
      new Date(2026, 7, 9, 12, 0, 0),
    )

    const audit = operation.changes[0].data.paymentAudit

    expect(audit).toHaveLength(20)
    expect(audit.at(-1).operationId).toBe(operation.operationId)
  })
})
