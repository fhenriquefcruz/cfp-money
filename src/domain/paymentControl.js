import {
  buildCreditCardCenter,
  isStructuredCreditTransaction,
  monthKeyFromDate,
} from './creditCardCenter'

export { isStructuredCreditTransaction }

export const PAYMENT_STATUS = {
  UNKNOWN: 'unknown',
  PENDING: 'pending',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
  PAID: 'paid',
  CANCELLED: 'cancelled',
}

const toCents = (value) => (Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) : 0)
const fromCents = (value) => value / 100

const todayIso = (now = new Date()) =>
  [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')

export function isPayableExpense(transaction = {}) {
  return transaction.type === 'expense' && !transaction.isSavings
}

export function getTransactionPaymentStatus(transaction = {}, now = new Date()) {
  if (transaction.paymentStatus === PAYMENT_STATUS.CANCELLED) {
    return PAYMENT_STATUS.CANCELLED
  }

  if (transaction.paymentStatus === PAYMENT_STATUS.PAID) return PAYMENT_STATUS.PAID
  if (transaction.paymentStatus === PAYMENT_STATUS.UNKNOWN) return PAYMENT_STATUS.UNKNOWN

  const explicitlyPending =
    transaction.paymentStatus === PAYMENT_STATUS.PENDING || transaction.isPaid === false

  if (explicitlyPending) {
    const dueDate =
      typeof transaction.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(transaction.dueDate)
        ? transaction.dueDate
        : ''

    return dueDate && dueDate < todayIso(now) ? PAYMENT_STATUS.OVERDUE : PAYMENT_STATUS.PENDING
  }

  if (transaction.isPaid === true) return PAYMENT_STATUS.PAID

  return PAYMENT_STATUS.UNKNOWN
}

export function isTransactionPaid(transaction = {}) {
  return getTransactionPaymentStatus(transaction) === PAYMENT_STATUS.PAID
}

export function canToggleTransactionPayment(transaction = {}) {
  return (
    isPayableExpense(transaction) &&
    !isStructuredCreditTransaction(transaction) &&
    getTransactionPaymentStatus(transaction) !== PAYMENT_STATUS.CANCELLED
  )
}

export function createPaymentPersistenceChange(isPaid, paidAt) {
  return {
    paymentStatus: isPaid ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
    paidAt: isPaid ? paidAt : null,
  }
}

export function createPaymentStatusChange(isPaid, paidAt = new Date()) {
  return createPaymentPersistenceChange(isPaid, isPaid ? paidAt.toISOString() : null)
}

function invoicePaymentState(lifecycle = {}) {
  const paid = Number(lifecycle.remainingAmount || 0) <= 0
  const partial = !paid && Number(lifecycle.paidAmount || 0) > 0
  const overdue = Boolean(lifecycle.overdue)

  if (paid) {
    return {
      status: PAYMENT_STATUS.PAID,
      source: 'invoice',
      detail: 'paid',
    }
  }

  if (overdue) {
    return {
      status: PAYMENT_STATUS.OVERDUE,
      source: 'invoice',
      detail: partial ? 'overdue_partial' : 'overdue',
    }
  }

  if (partial) {
    return {
      status: PAYMENT_STATUS.PARTIAL,
      source: 'invoice',
      detail: 'partial',
    }
  }

  return {
    status: PAYMENT_STATUS.PENDING,
    source: 'invoice',
    detail: 'pending',
  }
}

export function buildPaymentStatusIndex({
  transactions = [],
  creditCards = [],
  invoiceEvents = [],
  now = new Date(),
} = {}) {
  const index = new Map()
  const months = new Set(
    transactions
      .filter(isStructuredCreditTransaction)
      .map(
        (transaction) =>
          transaction.invoiceMonth ||
          transaction.dueDate?.slice(0, 7) ||
          transaction.date?.slice(0, 7),
      )
      .filter(Boolean),
  )

  months.forEach((selectedMonth) => {
    const center = buildCreditCardCenter({
      transactions,
      creditCards,
      invoiceEvents,
      selectedMonth,
      now,
      forecastMonths: 1,
    })

    center.invoices.forEach((invoice) => {
      const state = invoicePaymentState(invoice.lifecycle)
      invoice.items.forEach((transaction) => index.set(transaction.id, state))
    })
  })

  return index
}

export function getTransactionPaymentState(transaction = {}, paymentStatusIndex = new Map()) {
  if (isStructuredCreditTransaction(transaction)) {
    return (
      paymentStatusIndex.get(transaction.id) || {
        status: PAYMENT_STATUS.PENDING,
        source: 'invoice',
        detail: 'pending',
      }
    )
  }

  return {
    status: getTransactionPaymentStatus(transaction),
    source: 'transaction',
    detail: getTransactionPaymentStatus(transaction),
  }
}

export function summarizePaymentControl(transactions = [], bounds = {}, now = new Date()) {
  const expenses = transactions.filter((transaction) => {
    if (!isPayableExpense(transaction)) return false
    if (getTransactionPaymentStatus(transaction, now) === PAYMENT_STATUS.CANCELLED) return false
    if ((bounds.start || bounds.end) && typeof transaction.date !== 'string') return false
    if (bounds.start && transaction.date < bounds.start) return false
    if (bounds.end && transaction.date > bounds.end) return false
    return true
  })

  const paid = expenses.filter(
    (transaction) => getTransactionPaymentStatus(transaction, now) === PAYMENT_STATUS.PAID,
  )
  const pending = expenses.filter(
    (transaction) => getTransactionPaymentStatus(transaction, now) === PAYMENT_STATUS.PENDING,
  )
  const overdue = expenses.filter(
    (transaction) => getTransactionPaymentStatus(transaction, now) === PAYMENT_STATUS.OVERDUE,
  )
  const unknown = expenses.filter(
    (transaction) => getTransactionPaymentStatus(transaction, now) === PAYMENT_STATUS.UNKNOWN,
  )

  const totalCents = expenses.reduce((total, transaction) => total + toCents(transaction.amount), 0)
  const paidCents = paid.reduce((total, transaction) => total + toCents(transaction.amount), 0)
  const pendingCents = pending.reduce(
    (total, transaction) => total + toCents(transaction.amount),
    0,
  )
  const overdueCents = overdue.reduce(
    (total, transaction) => total + toCents(transaction.amount),
    0,
  )
  const unknownCents = unknown.reduce(
    (total, transaction) => total + toCents(transaction.amount),
    0,
  )

  return {
    totalAmount: fromCents(totalCents),
    paidAmount: fromCents(paidCents),
    pendingAmount: fromCents(pendingCents),
    overdueAmount: fromCents(overdueCents),
    unknownAmount: fromCents(unknownCents),
    totalCount: expenses.length,
    paidCount: paid.length,
    pendingCount: pending.length,
    overdueCount: overdue.length,
    unknownCount: unknown.length,
    progress: totalCents > 0 ? Math.min(100, (paidCents / totalCents) * 100) : 0,
  }
}

const PAYMENT_AUDIT_LIMIT = 20

function getPersistedManualPaymentStatus(transaction = {}) {
  if (
    transaction.paymentStatus === PAYMENT_STATUS.PAID ||
    transaction.paymentStatus === PAYMENT_STATUS.PENDING ||
    transaction.paymentStatus === PAYMENT_STATUS.UNKNOWN ||
    transaction.paymentStatus === PAYMENT_STATUS.CANCELLED
  ) {
    return transaction.paymentStatus
  }

  if (transaction.isPaid === true) return PAYMENT_STATUS.PAID
  if (transaction.isPaid === false) return PAYMENT_STATUS.PENDING

  return PAYMENT_STATUS.UNKNOWN
}

export function ensureTransactionPaymentDefaults(transaction = {}) {
  if (!isPayableExpense(transaction)) return transaction
  if (isStructuredCreditTransaction(transaction)) return transaction

  const hasKnownStatus =
    transaction.paymentStatus === PAYMENT_STATUS.PAID ||
    transaction.paymentStatus === PAYMENT_STATUS.PENDING ||
    transaction.paymentStatus === PAYMENT_STATUS.UNKNOWN ||
    transaction.paymentStatus === PAYMENT_STATUS.CANCELLED

  if (hasKnownStatus || typeof transaction.isPaid === 'boolean') {
    return transaction
  }

  return {
    ...transaction,
    paymentStatus: PAYMENT_STATUS.PENDING,
    isPaid: false,
    paidAt: null,
  }
}

export function createPaymentStateChange(status, paidAt = new Date()) {
  if (status === PAYMENT_STATUS.PAID) {
    return {
      paymentStatus: PAYMENT_STATUS.PAID,
      isPaid: true,
      paidAt,
    }
  }

  if (status === PAYMENT_STATUS.PENDING) {
    return {
      paymentStatus: PAYMENT_STATUS.PENDING,
      isPaid: false,
      paidAt: null,
    }
  }

  if (status === PAYMENT_STATUS.UNKNOWN) {
    return {
      paymentStatus: PAYMENT_STATUS.UNKNOWN,
      isPaid: false,
      paidAt: null,
    }
  }

  if (status === PAYMENT_STATUS.CANCELLED) {
    return {
      paymentStatus: PAYMENT_STATUS.CANCELLED,
      isPaid: false,
      paidAt: null,
    }
  }

  throw new Error(`Estado de pagamento não persistível: ${status}`)
}

function appendPaymentAudit(history, entry) {
  const current = Array.isArray(history) ? history : []
  return [...current, entry].slice(-PAYMENT_AUDIT_LIMIT)
}

function paymentOperationId(now) {
  return `payment-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`
}

export function buildPaymentBulkOperation(transactions = [], targetStatus, now = new Date()) {
  if (targetStatus !== PAYMENT_STATUS.PAID && targetStatus !== PAYMENT_STATUS.PENDING) {
    throw new Error('Ação em massa aceita apenas pago ou pendente.')
  }

  const operationId = paymentOperationId(now)
  const changedAt = now.toISOString()

  const changes = transactions
    .filter(
      (transaction) =>
        isPayableExpense(transaction) &&
        !isStructuredCreditTransaction(transaction) &&
        getPersistedManualPaymentStatus(transaction) !== PAYMENT_STATUS.CANCELLED,
    )
    .map((transaction) => {
      const beforeStatus = getPersistedManualPaymentStatus(transaction)

      if (beforeStatus === targetStatus) return null

      const beforeDisplayStatus = getTransactionPaymentStatus(transaction, now)
      const beforePaidAt = transaction.paidAt ?? null

      const auditEntry = {
        operationId,
        action: 'payment_status_change',
        fromStatus: beforeDisplayStatus,
        toStatus: targetStatus,
        changedAt,
      }

      return {
        id: transaction.id,
        beforeStatus,
        beforeDisplayStatus,
        beforePaidAt,
        toStatus: targetStatus,
        preservePaidAt: false,
        data: {
          ...createPaymentStateChange(targetStatus, now),
          paymentAudit: appendPaymentAudit(transaction.paymentAudit, auditEntry),
        },
      }
    })
    .filter(Boolean)

  return {
    kind: 'bulk',
    operationId,
    targetStatus,
    changedAt,
    changes,
  }
}

export function buildPaymentUndoOperation(operation = {}, now = new Date()) {
  const sourceChanges = Array.isArray(operation.changes) ? operation.changes : []

  const operationId = `${operation.operationId || paymentOperationId(now)}:undo`
  const changedAt = now.toISOString()

  return {
    kind: 'undo',
    operationId,
    changedAt,
    changes: sourceChanges.map((change) => {
      const auditEntry = {
        operationId,
        action: 'payment_status_undo',
        fromStatus: change.toStatus,
        toStatus: change.beforeDisplayStatus || change.beforeStatus,
        changedAt,
      }

      return {
        id: change.id,
        fromStatus: change.toStatus,
        toStatus: change.beforeStatus,
        preservePaidAt: change.beforeStatus === PAYMENT_STATUS.PAID && Boolean(change.beforePaidAt),
        data: {
          ...createPaymentStateChange(change.beforeStatus, change.beforePaidAt || now),
          paymentAudit: appendPaymentAudit(change.data?.paymentAudit, auditEntry),
        },
      }
    }),
  }
}

export function buildPaymentControlOverview({
  transactions = [],
  creditCards = [],
  invoiceEvents = [],
  bounds = {},
  now = new Date(),
} = {}) {
  const monthlyExpenses = transactions.filter((transaction) => {
    if (!isPayableExpense(transaction)) return false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date || '')) return false
    if (bounds.start && transaction.date < bounds.start) return false
    if (bounds.end && transaction.date > bounds.end) return false
    return true
  })

  const manualTransactions = monthlyExpenses.filter(
    (transaction) => !isStructuredCreditTransaction(transaction),
  )

  const manual = summarizePaymentControl(manualTransactions, {}, now)

  const dueWindowStart = todayIso(now)
  const dueWindowEnd = todayIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7))

  const manualDueNext7Days = manualTransactions.filter((transaction) => {
    const status = getTransactionPaymentStatus(transaction, now)
    const dueDate =
      typeof transaction.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(transaction.dueDate)
        ? transaction.dueDate
        : ''

    return status === PAYMENT_STATUS.PENDING && dueDate >= dueWindowStart && dueDate <= dueWindowEnd
  })

  const manualDueNext7DaysCents = manualDueNext7Days.reduce(
    (total, transaction) => total + toCents(transaction.amount),
    0,
  )

  const selectedMonth = monthKeyFromDate(bounds.start || now)

  const center = buildCreditCardCenter({
    transactions,
    creditCards,
    invoiceEvents,
    selectedMonth,
    now,
    forecastMonths: 1,
  })

  const cardObligations = center.invoices.filter(
    (invoice) => toCents(invoice.lifecycle.invoiceTotal) > 0,
  )

  const cardStates = cardObligations.map((invoice) => ({
    invoice,
    state: invoicePaymentState(invoice.lifecycle),
  }))

  const cardPaidCount = cardStates.filter(
    ({ state }) => state.status === PAYMENT_STATUS.PAID,
  ).length

  const cardOverdueCount = cardStates.filter(
    ({ state }) => state.status === PAYMENT_STATUS.OVERDUE,
  ).length

  const cardPendingCount = cardStates.filter(
    ({ state }) =>
      state.status === PAYMENT_STATUS.PENDING || state.status === PAYMENT_STATUS.PARTIAL,
  ).length

  const cardPaidCents = Math.min(toCents(center.selectedPaidTotal), toCents(center.selectedTotal))

  const cardOverdueCents = cardStates.reduce(
    (total, { invoice, state }) =>
      total +
      (state.status === PAYMENT_STATUS.OVERDUE ? toCents(invoice.lifecycle.remainingAmount) : 0),
    0,
  )

  const cardPendingCents = cardStates.reduce(
    (total, { invoice, state }) =>
      total +
      (state.status === PAYMENT_STATUS.PENDING || state.status === PAYMENT_STATUS.PARTIAL
        ? toCents(invoice.lifecycle.remainingAmount)
        : 0),
    0,
  )

  const cardDueNext7Days = cardStates.filter(({ invoice, state }) => {
    const dueDate = invoice.dates?.dueDate || ''

    return (
      (state.status === PAYMENT_STATUS.PENDING || state.status === PAYMENT_STATUS.PARTIAL) &&
      dueDate >= dueWindowStart &&
      dueDate <= dueWindowEnd
    )
  })

  const cardDueNext7DaysCents = cardDueNext7Days.reduce(
    (total, { invoice }) => total + toCents(invoice.lifecycle.remainingAmount),
    0,
  )

  const totalCents = toCents(manual.totalAmount) + toCents(center.selectedTotal)

  const paidCents = toCents(manual.paidAmount) + cardPaidCents

  const pendingCents = toCents(manual.pendingAmount) + cardPendingCents

  const overdueCents = toCents(manual.overdueAmount) + cardOverdueCents

  const unknownCents = toCents(manual.unknownAmount)

  const toPayCents = pendingCents + overdueCents

  const toPayCount = manual.pendingCount + manual.overdueCount + cardPendingCount + cardOverdueCount

  const dueNext7DaysCents = manualDueNext7DaysCents + cardDueNext7DaysCents

  const dueNext7DaysCount = manualDueNext7Days.length + cardDueNext7Days.length

  // ----------------------------------------------------------
  // Comparação com o mês anterior
  // ----------------------------------------------------------
  const [selectedYear, selectedMonthNumber] = selectedMonth.split('-').map(Number)

  const previousMonthDate = new Date(selectedYear, selectedMonthNumber - 2, 1)

  const previousMonth = monthKeyFromDate(previousMonthDate)

  const previousLastDay = new Date(
    previousMonthDate.getFullYear(),
    previousMonthDate.getMonth() + 1,
    0,
  ).getDate()

  const previousBounds = {
    start: `${previousMonth}-01`,
    end: `${previousMonth}-${String(previousLastDay).padStart(2, '0')}`,
  }

  const previousManualTransactions = transactions.filter((transaction) => {
    if (!isPayableExpense(transaction)) return false
    if (isStructuredCreditTransaction(transaction)) return false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date || '')) return false
    if (transaction.date < previousBounds.start) return false
    if (transaction.date > previousBounds.end) return false
    return true
  })

  const previousManual = summarizePaymentControl(previousManualTransactions, {}, now)

  const previousCenter = buildCreditCardCenter({
    transactions,
    creditCards,
    invoiceEvents,
    selectedMonth: previousMonth,
    now,
    forecastMonths: 1,
  })

  const previousCommittedCents =
    toCents(previousManual.totalAmount) + toCents(previousCenter.selectedTotal)

  const committedDeltaCents = totalCents - previousCommittedCents

  const committedDeltaPercent =
    previousCommittedCents > 0
      ? Math.round((committedDeltaCents / previousCommittedCents) * 10000) / 100
      : null

  // ----------------------------------------------------------
  // Distribuição semanal pelo vencimento
  // ----------------------------------------------------------
  const [weeklyYear, weeklyMonth] = selectedMonth.split('-').map(Number)

  const lastDayOfSelectedMonth = new Date(weeklyYear, weeklyMonth, 0).getDate()

  const knownManualObligations = manualTransactions
    .map((transaction) => ({
      status: getTransactionPaymentStatus(transaction, now),
      dueDate:
        typeof transaction.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(transaction.dueDate)
          ? transaction.dueDate
          : '',
      amount: transaction.amount,
    }))
    .filter(
      (obligation) =>
        (obligation.status === PAYMENT_STATUS.PENDING ||
          obligation.status === PAYMENT_STATUS.OVERDUE) &&
        obligation.dueDate.startsWith(`${selectedMonth}-`),
    )

  const knownCardObligations = cardStates
    .map(({ invoice, state }) => ({
      status: state.status,
      dueDate: invoice.dates?.dueDate || '',
      amount: invoice.lifecycle.remainingAmount,
    }))
    .filter(
      (obligation) =>
        (obligation.status === PAYMENT_STATUS.PENDING ||
          obligation.status === PAYMENT_STATUS.PARTIAL ||
          obligation.status === PAYMENT_STATUS.OVERDUE) &&
        obligation.dueDate.startsWith(`${selectedMonth}-`) &&
        toCents(obligation.amount) > 0,
    )

  const weeklyObligations = [...knownManualObligations, ...knownCardObligations]

  const weekly = []

  for (let startDay = 1; startDay <= lastDayOfSelectedMonth; startDay += 7) {
    const endDay = Math.min(startDay + 6, lastDayOfSelectedMonth)

    const startDate = `${selectedMonth}-${String(startDay).padStart(2, '0')}`

    const endDate = `${selectedMonth}-${String(endDay).padStart(2, '0')}`

    const obligations = weeklyObligations.filter(
      (obligation) => obligation.dueDate >= startDate && obligation.dueDate <= endDate,
    )

    const amountCents = obligations.reduce(
      (total, obligation) => total + toCents(obligation.amount),
      0,
    )

    weekly.push({
      start: startDate,
      end: endDate,
      toPayAmount: fromCents(amountCents),
      toPayCount: obligations.length,
    })
  }

  return {
    totalAmount: fromCents(totalCents),
    committedAmount: fromCents(totalCents),

    paidAmount: fromCents(paidCents),
    pendingAmount: fromCents(pendingCents),
    overdueAmount: fromCents(overdueCents),
    unknownAmount: fromCents(unknownCents),

    toPayAmount: fromCents(toPayCents),
    dueNext7DaysAmount: fromCents(dueNext7DaysCents),

    totalCount: manual.totalCount + cardObligations.length,
    paidCount: manual.paidCount + cardPaidCount,
    pendingCount: manual.pendingCount + cardPendingCount,
    overdueCount: manual.overdueCount + cardOverdueCount,
    unknownCount: manual.unknownCount,

    toPayCount,
    dueNext7DaysCount,

    progress: totalCents > 0 ? Math.min(100, (paidCents / totalCents) * 100) : 0,

    comparison: {
      previousCommittedAmount: fromCents(previousCommittedCents),
      committedDeltaAmount: fromCents(committedDeltaCents),
      committedDeltaPercent,
    },

    weekly,

    card: {
      totalAmount: center.selectedTotal,
      paidAmount: fromCents(cardPaidCents),
      pendingAmount: fromCents(cardPendingCents),
      overdueAmount: fromCents(cardOverdueCents),
      dueNext7DaysAmount: fromCents(cardDueNext7DaysCents),

      itemCount: center.selectedItemCount,
      obligationCount: cardObligations.length,

      paidCount: cardPaidCount,
      pendingCount: cardPendingCount,
      overdueCount: cardOverdueCount,
      dueNext7DaysCount: cardDueNext7Days.length,
    },
  }
}
