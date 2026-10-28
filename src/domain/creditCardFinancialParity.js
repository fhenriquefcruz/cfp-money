import {
  buildCreditCardCenter,
  isStructuredCreditTransaction,
  resolveCreditTransactionInvoiceMonth,
} from './creditCardCenter'
import { auditCreditCardIntegrity } from './creditCardIntegrity'
import { isCreditExpense } from './cardLinkageSummary'

const toCents = (value) => Math.round(Number(value || 0) * 100)
const fromCents = (value) => value / 100

// Comparação consultiva: nenhuma escrita, ajuste automático ou inferência persistida.
export function auditCreditCardFinancialParity({
  transactions = [],
  creditCards = [],
  invoiceEvents = [],
  selectedMonth,
  now,
} = {}) {
  const center = buildCreditCardCenter({
    transactions,
    creditCards,
    invoiceEvents,
    ...(selectedMonth ? { selectedMonth } : {}),
    ...(now ? { now } : {}),
  })
  const integrity = auditCreditCardIntegrity({ transactions, creditCards })
  const findings = []
  const add = (code, severity, details = {}) => findings.push({ code, severity, ...details })
  const month = center.selectedMonth
  const cardIds = new Set()
  for (const card of creditCards) {
    if (!card?.id) {
      add('missing_card_registration_id', 'critical')
    } else if (cardIds.has(card.id)) {
      add('duplicate_card_registration_id', 'critical', { cardId: card.id })
    } else {
      cardIds.add(card.id)
    }
  }
  const seen = new Set()
  let sourcePurchaseCents = 0

  for (const tx of transactions) {
    if (!isCreditExpense(tx)) continue
    if (tx.id) {
      if (seen.has(tx.id)) add('duplicate_transaction_id', 'critical', { transactionId: tx.id })
      seen.add(tx.id)
    }
    if (!Number.isFinite(Number(tx.amount))) {
      add('invalid_purchase_amount', 'critical', { transactionId: tx.id || null })
    }
    // Registros originais apenas: não aplicar vínculos sugeridos em memória.
    if (!isStructuredCreditTransaction(tx)) continue
    const card = creditCards.find((item) => item.id === tx.cardId) || {
      closingDay: tx.cardClosingDay,
      dueDay: tx.cardDueDay,
    }
    if (resolveCreditTransactionInvoiceMonth(tx, card) === month) {
      sourcePurchaseCents += Number.isFinite(Number(tx.amount)) ? toCents(tx.amount) : 0
    }
  }

  for (const transactionId of integrity.exceptions.invalidMonth) {
    add('invalid_invoice_month', 'critical', { transactionId })
  }
  if (integrity.invalidMonthCount > integrity.exceptions.invalidMonth.length) {
    add('invalid_invoice_month_without_id', 'critical')
  }
  if (integrity.unlinkedCount) {
    add('unlinked_credit_purchases', 'review', {
      count: integrity.unlinkedCount,
      amount: integrity.unlinkedTotal,
    })
  }
  if (integrity.historicalCount) {
    add('historical_card_references', 'info', { count: integrity.historicalCount })
  }
  if (center.reconciledPurchaseCount) {
    add('unsaved_card_match_preview', 'review', { count: center.reconciledPurchaseCount })
  }

  const invoices = center.invoices.map((invoice) => {
    const { lifecycle } = invoice
    const paidByTransactionCents = invoice.items
      .filter((tx) => tx.paymentStatus === 'paid' || tx.isPaid === true)
      .reduce((sum, tx) => sum + (Number.isFinite(Number(tx.amount)) ? toCents(tx.amount) : 0), 0)
    const manualEvents = invoice.events.filter(
      (event) => event.type === 'payment' || event.type === 'reversal',
    )
    if (manualEvents.length && paidByTransactionCents > 0) {
      add('mixed_payment_sources', 'review', {
        cardId: invoice.card.id,
        invoiceMonth: month,
        transactionPaidAmount: fromCents(paidByTransactionCents),
      })
    }
    for (const event of invoice.events) {
      if (event.type !== 'reversal') continue
      if (!invoice.events.some((item) => item.type === 'payment' && item.id === event.reversesEventId)) {
        add('unmatched_payment_reversal', 'review', {
          cardId: invoice.card.id,
          invoiceMonth: month,
          eventId: event.id || null,
        })
      }
    }
    const purchaseCents = invoice.items.reduce(
      (sum, item) => sum + (Number.isFinite(Number(item.amount)) ? toCents(item.amount) : 0),
      0,
    )
    const total = toCents(lifecycle.invoiceTotal)
    const paid = toCents(lifecycle.paidAmount)
    const remaining = toCents(lifecycle.remainingAmount)
    const credit = toCents(lifecycle.creditAmount)
    if (
      purchaseCents !== toCents(invoice.purchaseTotal) ||
      total !== Math.max(0, purchaseCents + toCents(lifecycle.adjustmentTotal)) ||
      remaining !== Math.max(0, total - paid) ||
      credit !== Math.max(0, paid - total)
    ) {
      add('invoice_arithmetic_mismatch', 'critical', {
        cardId: invoice.card.id,
        invoiceMonth: month,
      })
    }
    return {
      cardId: invoice.card.id,
      historicalOnly: invoice.card.historicalOnly,
      invoiceMonth: month,
      purchaseTotal: invoice.purchaseTotal,
      adjustmentTotal: lifecycle.adjustmentTotal,
      invoiceTotal: lifecycle.invoiceTotal,
      paidTotal: lifecycle.paidAmount,
      remainingTotal: lifecycle.remainingAmount,
      creditTotal: lifecycle.creditAmount,
      futureCommitmentTotal: invoice.futureCommitmentTotal,
      paymentSource: invoice.paymentSource,
    }
  })

  const summed = (selector) => invoices.reduce((total, invoice) => total + toCents(selector(invoice)), 0)
  if (
    summed((invoice) => invoice.invoiceTotal) !== toCents(center.selectedTotal) ||
    summed((invoice) => invoice.paidTotal) !== toCents(center.selectedPaidTotal) ||
    summed((invoice) => invoice.remainingTotal) !== toCents(center.selectedRemainingTotal) ||
    summed((invoice) => invoice.creditTotal) !== toCents(center.selectedCreditTotal)
  ) {
    add('dashboard_invoice_totals_mismatch', 'critical', { invoiceMonth: month })
  }

  const previewDeltaCents = toCents(center.selectedPurchaseTotal) - sourcePurchaseCents
  if (previewDeltaCents !== 0 && !center.reconciledPurchaseCount) {
    add('saved_purchase_ledger_mismatch', 'critical', { invoiceMonth: month })
  }

  return {
    readOnly: true,
    invoiceMonth: month,
    status: findings.some((finding) => finding.severity === 'critical')
      ? 'critical'
      : findings.some((finding) => finding.severity === 'review')
        ? 'review'
        : 'ok',
    counts: {
      saved: integrity.savedLinkCount,
      unlinked: integrity.unlinkedCount,
      historical: integrity.historicalCount,
      previewMatches: center.reconciledPurchaseCount,
      invoices: invoices.length,
    },
    totals: {
      sourceSavedPurchases: fromCents(sourcePurchaseCents),
      displayedPurchases: center.selectedPurchaseTotal,
      previewDelta: fromCents(previewDeltaCents),
      invoiceTotal: center.selectedTotal,
      paidTotal: center.selectedPaidTotal,
      remainingTotal: center.selectedRemainingTotal,
      creditTotal: center.selectedCreditTotal,
      futureInstallments: center.futureInstallmentTotal,
    },
    invoices,
    findings,
  }
}
