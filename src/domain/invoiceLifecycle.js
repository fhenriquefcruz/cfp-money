function toCents(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0
}

function fromCents(value) {
  return value / 100
}

function sumCents(items, selector) {
  return items.reduce((total, item) => total + toCents(selector(item)), 0)
}

export function todayIso(now = new Date()) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

export function buildInvoiceKey(cardId, invoiceMonth) {
  return `${String(cardId || '').trim()}:${String(invoiceMonth || '').trim()}`
}

export function getInvoiceEvents(events = [], cardId, invoiceMonth) {
  const invoiceKey = buildInvoiceKey(cardId, invoiceMonth)

  const date = (event) =>
    String(event.eventDate || event.paymentDate || event.createdAt?.toDate?.()?.toISOString?.() || '')

  return events
    .filter(
      (event) =>
        event.invoiceKey === invoiceKey ||
        (event.cardId === cardId && event.invoiceMonth === invoiceMonth),
    )
    .sort((first, second) => date(second).localeCompare(date(first)))
}

export function getPaymentReversibleAmount(payment, invoiceEvents = []) {
  if (!payment || payment.type !== 'payment') return 0

  const reversedCents = sumCents(
    invoiceEvents.filter(
      (event) => event.type === 'reversal' && event.reversesEventId === payment.id,
    ),
    (event) => event.amount,
  )

  return fromCents(Math.max(0, toCents(payment.amount) - reversedCents))
}

export function buildInvoiceLifecycle({
  purchaseTotal = 0,
  baselinePaidAmount = 0,
  events = [],
  closingDate = '',
  dueDate = '',
  temporalStatus = 'forming',
  now = new Date(),
}) {
  let adjustmentCents = 0
  let paymentCents = 0
  let reversalCents = 0
  let paymentCount = 0
  let reversalCount = 0
  let manuallyClosed = false
  for (const event of events) {
    if (event.type === 'adjustment') adjustmentCents += toCents(event.signedAmount)
    else if (event.type === 'payment') {
      paymentCents += toCents(event.amount)
      paymentCount++
    } else if (event.type === 'reversal') {
      reversalCents += toCents(event.amount)
      reversalCount++
    } else if (event.type === 'manual_close') manuallyClosed = true
  }

  const invoiceTotalCents = Math.max(0, toCents(purchaseTotal) + adjustmentCents)
  const baselinePaidCents = Math.max(0, toCents(baselinePaidAmount))
  const paidCents = Math.max(0, baselinePaidCents + paymentCents - reversalCents)
  const remainingCents = Math.max(0, invoiceTotalCents - paidCents)
  const creditCents = Math.max(0, paidCents - invoiceTotalCents)
  const today = todayIso(now)
  const isClosed =
    manuallyClosed ||
    temporalStatus === 'closed' ||
    temporalStatus === 'past_due' ||
    temporalStatus === 'due_today' ||
    Boolean(closingDate && closingDate < today)
  const overdue = Boolean(dueDate && dueDate < today && remainingCents > 0)

  let status = temporalStatus
  if (invoiceTotalCents === 0 && paidCents === 0) {
    status = 'empty'
  } else if (creditCents > 0) {
    status = 'overpaid'
  } else if (invoiceTotalCents > 0 && remainingCents === 0) {
    status = 'paid'
  } else if (overdue && paidCents > 0) {
    status = 'overdue_partial'
  } else if (overdue) {
    status = 'overdue'
  } else if (paidCents > 0) {
    status = 'partially_paid'
  } else if (dueDate === today && remainingCents > 0) {
    status = 'due_today'
  } else if (isClosed) {
    status = 'closed'
  }

  return {
    purchaseTotal: fromCents(toCents(purchaseTotal)),
    adjustmentTotal: fromCents(adjustmentCents),
    invoiceTotal: fromCents(invoiceTotalCents),
    baselinePaidAmount: fromCents(baselinePaidCents),
    paidAmount: fromCents(paidCents),
    remainingAmount: fromCents(remainingCents),
    creditAmount: fromCents(creditCents),
    paymentCount,
    reversalCount,
    manuallyClosed,
    isClosed,
    overdue,
    status,
    events,
  }
}

export function createInvoiceEventBase({ card, invoiceMonth, type, eventDate, notes = '' }) {
  if (!card?.id) throw new Error('Cartão inválido.')
  if (!/^\d{4}-\d{2}$/.test(invoiceMonth || '')) {
    throw new Error('Mês da fatura inválido.')
  }

  return {
    type,
    invoiceKey: buildInvoiceKey(card.id, invoiceMonth),
    cardId: card.id,
    cardName: card.name || '',
    cardLast4: card.last4 || '',
    invoiceMonth,
    eventDate,
    notes: String(notes || '').trim(),
  }
}

export function createPaymentEvent({
  card,
  invoiceMonth,
  amount,
  paymentDate,
  sourceAccount = '',
  notes = '',
}) {
  const normalizedAmount = fromCents(toCents(amount))
  if (normalizedAmount <= 0) {
    throw new Error('Informe um pagamento maior que zero.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate || '')) {
    throw new Error('Data de pagamento inválida.')
  }

  return {
    ...createInvoiceEventBase({
      card,
      invoiceMonth,
      type: 'payment',
      eventDate: paymentDate,
      notes,
    }),
    amount: normalizedAmount,
    paymentDate,
    sourceAccount: String(sourceAccount || '').trim(),
  }
}

export function createAdjustmentEvent({
  card,
  invoiceMonth,
  amount,
  direction = 'charge',
  eventDate,
  notes = '',
}) {
  const normalizedAmount = fromCents(toCents(amount))
  if (normalizedAmount <= 0) {
    throw new Error('Informe um ajuste maior que zero.')
  }
  if (!String(notes || '').trim()) {
    throw new Error('Descreva o motivo do ajuste.')
  }

  return {
    ...createInvoiceEventBase({
      card,
      invoiceMonth,
      type: 'adjustment',
      eventDate,
      notes,
    }),
    direction,
    signedAmount: direction === 'credit' ? -normalizedAmount : normalizedAmount,
  }
}

export function createManualCloseEvent({ card, invoiceMonth, eventDate, notes = '' }) {
  return createInvoiceEventBase({
    card,
    invoiceMonth,
    type: 'manual_close',
    eventDate,
    notes,
  })
}

export function canAutoReversePayment(payment, invoiceEvents = []) {
  return (
    payment?.type === 'payment' &&
    /^evt_[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(payment.id || '') &&
    !invoiceEvents.some(
      (event) => event.type === 'reversal' && event.reversesEventId === payment.id,
    ) &&
    toCents(payment.amount) > 0
  )
}

export function createReversalEvent({
  card,
  invoiceMonth,
  payment,
  invoiceEvents,
  eventDate,
  notes = '',
}) {
  if (!canAutoReversePayment(payment, invoiceEvents)) {
    throw new Error('Pagamento já estornado ou pendente de revisão histórica.')
  }
  if (
    payment.invoiceKey !== buildInvoiceKey(card?.id, invoiceMonth) ||
    payment.cardId !== card.id
  ) {
    throw new Error('Pagamento pertence a outra fatura.')
  }
  const reversibleAmount = fromCents(toCents(payment.amount))

  return {
    operationId: 'rev_' + payment.id,
    ...createInvoiceEventBase({
      card,
      invoiceMonth,
      type: 'reversal',
      eventDate,
      notes,
    }),
    amount: reversibleAmount,
    reversesEventId: payment.id,
    sourceAccount: payment.sourceAccount || '',
  }
}
