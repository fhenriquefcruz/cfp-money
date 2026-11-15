/**
 * Seletores de atividade compartilhados entre aplicativo e Worker.
 * Contrato sem dependências de React, Firebase, timezone ou IO.
 */
export const getFinancialActivityDate = (transaction = {}) =>
  transaction.type === 'expense' &&
  transaction.paymentMethod === 'credit_card' &&
  transaction.isCreditPurchase
    ? transaction.purchaseDate || transaction.originalPurchaseDate || transaction.date || ''
    : transaction.date || transaction.dueDate || ''

export const isFinanciallyEffectiveTransaction = (transaction = {}) =>
  transaction.paymentStatus !== 'cancelled' &&
  transaction.flowType !== 'transfer' &&
  transaction.kind !== 'transfer'
