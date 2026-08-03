export const PAYMENT_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
}

const asAmount = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)

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

export function createPaymentPersistenceChange(isPaid, paidAt) {
  return {
    paymentStatus: isPaid ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
    paidAt: isPaid ? paidAt : null,
  }
}

export function createPaymentStatusChange(isPaid, paidAt = new Date()) {
  return createPaymentPersistenceChange(isPaid, isPaid ? paidAt.toISOString() : null)
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
  const totalAmount = expenses.reduce(
    (total, transaction) => total + asAmount(transaction.amount),
    0,
  )
  const paidAmount = paid.reduce((total, transaction) => total + asAmount(transaction.amount), 0)
  const pendingAmount = pending.reduce(
    (total, transaction) => total + asAmount(transaction.amount),
    0,
  )

  return {
    totalAmount,
    paidAmount,
    pendingAmount,
    totalCount: expenses.length,
    paidCount: paid.length,
    pendingCount: pending.length,
    progress: totalAmount > 0 ? Math.min(100, (paidAmount / totalAmount) * 100) : 0,
  }
}
