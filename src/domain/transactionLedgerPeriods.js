import {
  getTransactionAccountingDate,
  getTransactionActivityDate,
  isStructuredCreditPurchase,
} from './transactionDates'

// A competência exibida no extrato é uma escolha de apresentação. Não altera
// a data de atividade canônica usada em Dashboard, Orçamentos e Relatórios.
export function getTransactionLedgerDate(transaction = {}, view = 'invoice') {
  if (
    view === 'invoice' &&
    (isStructuredCreditPurchase(transaction) ||
      (transaction.type === 'expense' &&
        transaction.cardId &&
        transaction.paymentMethod === 'credit_card'))
  ) {
    return getTransactionAccountingDate(transaction) || getTransactionActivityDate(transaction)
  }
  return getTransactionActivityDate(transaction)
}
