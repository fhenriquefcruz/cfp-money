import {
  buildCreditCardCenter,
  isStructuredCreditTransaction,
  monthKeyFromDate,
} from './creditCardCenter'

export const PAYMENT_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
}

const toCents = (value) => (Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) : 0)
const fromCents = (value) => value / 100

export function isPayableExpense(transaction = {}) {
  return transaction.type === 'expense' && !transaction.isSavings
}

export function getTransactionPaymentStatus(transaction = {}) {
  if (transaction.paymentStatus === PAYMENT_STATUS.PAID) return PAYMENT_STATUS.PAID
  if (transaction.paymentStatus === PAYMENT_STATUS.PENDING) return PAYMENT_STATUS.PENDING
  return transaction.isPaid === true ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING
}

export function isTransactionPaid(transaction = {}) {
  return getTransactionPaymentStatus(transaction) === PAYMENT_STATUS.PAID
}

export function canToggleTransactionPayment(transaction = {}) {
  return isPayableExpense(transaction) && !isStructuredCreditTransaction(transaction)
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

  return {
    status: paid ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
    source: 'invoice',
    detail: paid ? 'paid' : partial ? 'partial' : 'pending',
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

export function summarizePaymentControl(transactions = [], bounds = {}) {
  const expenses = transactions.filter((transaction) => {
    if (!isPayableExpense(transaction)) return false
    if ((bounds.start || bounds.end) && typeof transaction.date !== 'string') return false
    if (bounds.start && transaction.date < bounds.start) return false
    if (bounds.end && transaction.date > bounds.end) return false
    return true
  })

  const paid = expenses.filter(isTransactionPaid)
  const pending = expenses.filter((transaction) => !isTransactionPaid(transaction))
  const totalCents = expenses.reduce((total, transaction) => total + toCents(transaction.amount), 0)
  const paidCents = paid.reduce((total, transaction) => total + toCents(transaction.amount), 0)
  const pendingCents = pending.reduce(
    (total, transaction) => total + toCents(transaction.amount),
    0,
  )

  return {
    totalAmount: fromCents(totalCents),
    paidAmount: fromCents(paidCents),
    pendingAmount: fromCents(pendingCents),
    totalCount: expenses.length,
    paidCount: paid.length,
    pendingCount: pending.length,
    progress: totalCents > 0 ? Math.min(100, (paidCents / totalCents) * 100) : 0,
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
  const manual = summarizePaymentControl(manualTransactions)
  const selectedMonth = monthKeyFromDate(bounds.start || now)
  const center = buildCreditCardCenter({
    transactions,
    creditCards,
    invoiceEvents,
    selectedMonth,
    now,
    forecastMonths: 1,
  })
  const statusIndex = buildPaymentStatusIndex({ transactions, creditCards, invoiceEvents, now })
  const cardPaidCount = center.selectedTransactions.filter(
    (transaction) =>
      getTransactionPaymentState(transaction, statusIndex).status === PAYMENT_STATUS.PAID,
  ).length
  const cardPaidCents = Math.min(toCents(center.selectedPaidTotal), toCents(center.selectedTotal))
  const totalCents = toCents(manual.totalAmount) + toCents(center.selectedTotal)
  const paidCents = toCents(manual.paidAmount) + cardPaidCents
  const pendingCents = toCents(manual.pendingAmount) + toCents(center.selectedRemainingTotal)

  return {
    totalAmount: fromCents(totalCents),
    paidAmount: fromCents(paidCents),
    pendingAmount: fromCents(pendingCents),
    totalCount: manual.totalCount + center.selectedItemCount,
    paidCount: manual.paidCount + cardPaidCount,
    pendingCount: manual.pendingCount + center.selectedItemCount - cardPaidCount,
    progress: totalCents > 0 ? Math.min(100, (paidCents / totalCents) * 100) : 0,
    card: {
      totalAmount: center.selectedTotal,
      paidAmount: fromCents(cardPaidCents),
      pendingAmount: center.selectedRemainingTotal,
      itemCount: center.selectedItemCount,
    },
  }
}
