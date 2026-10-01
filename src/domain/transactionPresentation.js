export const TRANSACTION_KIND = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
  SAVINGS: 'savings',
}

export function getTransactionKind(transaction = {}) {
  if (transaction.isSavings) return TRANSACTION_KIND.SAVINGS
  if (transaction.flowType === 'transfer' || transaction.kind === 'transfer') {
    return TRANSACTION_KIND.TRANSFER
  }
  return transaction.type === 'income' ? TRANSACTION_KIND.INCOME : TRANSACTION_KIND.EXPENSE
}

export function matchesTransactionKind(transaction, filter = 'all') {
  return filter === 'all' || getTransactionKind(transaction) === filter
}

export function transactionKindLabel(kind) {
  return (
    {
      [TRANSACTION_KIND.INCOME]: 'Receita',
      [TRANSACTION_KIND.EXPENSE]: 'Despesa',
      [TRANSACTION_KIND.TRANSFER]: 'Transferência',
      [TRANSACTION_KIND.SAVINGS]: 'Aporte / reserva',
    }[kind] || 'Movimentação'
  )
}
