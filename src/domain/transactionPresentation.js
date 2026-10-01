export const getTransactionKind = (transaction = {}) =>
  transaction.isSavings
    ? 'savings'
    : transaction.flowType === 'transfer' || transaction.kind === 'transfer'
      ? 'transfer'
      : transaction.type === 'income'
        ? 'income'
        : 'expense'

export const transactionKindLabel = (kind) =>
  ({ income: 'Receita', expense: 'Despesa', transfer: 'Transferência', savings: 'Aporte / reserva' })[
    kind
  ] || 'Movimentação'
