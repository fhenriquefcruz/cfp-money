import { calculateInvoiceSchedule } from './creditCards'

const MONTH = /^\\d{4}-(0[1-9]|1[0-2])$/

export function isUnlinkedCreditPurchase(transaction = {}) {
  return (
    transaction.type === 'expense' &&
    transaction.paymentMethod === 'credit_card' &&
    !transaction.isSavings &&
    transaction.paymentStatus !== 'cancelled' &&
    !transaction.cardId
  )
}

export function previewCardReconciliation(transaction, card) {
  if (!isUnlinkedCreditPurchase(transaction)) {
    throw new Error('Compra não elegível para conciliação.')
  }
  if (!card?.id || !card.name) throw new Error('Selecione um cartão cadastrado.')

  const purchaseDate = transaction.purchaseDate || transaction.originalPurchaseDate
  const month =
    transaction.invoiceMonth ||
    transaction.dueDate?.slice(0, 7) ||
    (purchaseDate
      ? calculateInvoiceSchedule(purchaseDate, card).invoiceMonth
      : transaction.date?.slice(0, 7))

  if (!MONTH.test(month || '')) {
    throw new Error('A competência da compra não pôde ser identificada.')
  }

  return {
    cardId: card.id,
    cardName: card.name,
    cardLast4: card.last4 || '',
    cardClosingDay: Number(card.closingDay) || 1,
    cardDueDay: Number(card.dueDay) || 1,
    invoiceMonth: month,
    isCreditPurchase: true,
  }
}
