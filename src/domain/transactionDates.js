const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function validIsoDate(value) {
  return typeof value === 'string' && ISO_DATE.test(value)
}

export function formatTransactionIsoDate(value) {
  if (!validIsoDate(value)) return 'data indisponível'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export function isStructuredCreditPurchase(transaction = {}) {
  return Boolean(
    transaction.type === 'expense' &&
    transaction.paymentMethod === 'credit_card' &&
    transaction.isCreditPurchase,
  )
}

export function getTransactionPurchaseDate(transaction = {}) {
  const candidate = transaction.purchaseDate || transaction.originalPurchaseDate || transaction.date

  return validIsoDate(candidate) ? candidate : ''
}

export function getTransactionAccountingDate(transaction = {}) {
  const candidate = transaction.dueDate || transaction.date
  return validIsoDate(candidate) ? candidate : ''
}

export function getTransactionActivityDate(transaction = {}) {
  if (isStructuredCreditPurchase(transaction)) return getTransactionPurchaseDate(transaction)
  return validIsoDate(transaction.date)
    ? transaction.date
    : getTransactionAccountingDate(transaction)
}

export function getTransactionDateContext(transaction = {}) {
  const purchaseDate = getTransactionPurchaseDate(transaction)
  const transactionDate = validIsoDate(transaction.date) ? transaction.date : ''
  const accountingDate = getTransactionAccountingDate(transaction)
  const structuredCredit = isStructuredCreditPurchase(transaction)
  const hasSeparateAccountingDate = Boolean(
    structuredCredit && purchaseDate && accountingDate && purchaseDate !== accountingDate,
  )

  return {
    structuredCredit,
    purchaseDate,
    transactionDate,
    accountingDate,
    activityDate: getTransactionActivityDate(transaction),
    purchaseLabel: formatTransactionIsoDate(purchaseDate),
    transactionLabel: formatTransactionIsoDate(transactionDate),
    accountingLabel: formatTransactionIsoDate(accountingDate),
    hasSeparateAccountingDate,
  }
}

export function isProtectedTransactionGroup(transaction = {}) {
  return Boolean(
    (transaction.isInstallment && transaction.installmentGroupId) ||
    (transaction.isRecurring && transaction.recurringGroupId),
  )
}


export const getTransactionKind = (transaction) =>
  transaction.isSavings
    ? 'savings'
    : transaction.flowType === 'transfer' || transaction.kind === 'transfer'
      ? 'transfer'
      : transaction.type === 'income'
        ? 'income'
        : 'expense'

const KIND_LABELS = {
  income: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
  savings: 'Aporte / reserva',
}

export const transactionKindLabel = (kind) => KIND_LABELS[kind]
