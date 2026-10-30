// Conferencia aritmetica interna de faturas ja carregadas. Nao consulta nem altera o Firebase.
function toCents(value) {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return null
  }
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  const cents = Math.round(numeric * 100)
  return Number.isSafeInteger(cents) ? cents : null
}

function sumCents(items, selector) {
  let total = 0
  for (const item of items) {
    const cents = toCents(selector(item))
    if (cents === null) return null
    total += cents
    if (!Number.isSafeInteger(total)) return null
  }
  return total
}

export function auditLoadedCardInvoices(invoices = []) {
  const summary = { total: 0, checked: 0, divergent: 0, inconclusive: 0 }
  for (const invoice of invoices) {
    const items = invoice?.items
    const events = invoice?.events
    const lifecycle = invoice?.lifecycle
    if (!Array.isArray(items) || !Array.isArray(events) || !lifecycle) {
      summary.total++
      summary.inconclusive++
      continue
    }

    // Um cartao sem lancamentos ou eventos nao representa uma fatura auditada.
    if (items.length === 0 && events.length === 0) continue
    summary.total++

    if (
      events.some(
        (event) =>
          !['payment', 'reversal', 'adjustment', 'manual_close'].includes(event?.type),
      )
    ) {
      summary.inconclusive++
      continue
    }

    const purchase = sumCents(items, (item) => item?.amount)
    const adjustments = sumCents(
      events.filter((event) => event.type === 'adjustment'),
      (event) => event.signedAmount,
    )
    const payments = sumCents(
      events.filter((event) => event.type === 'payment'),
      (event) => event.amount,
    )
    const reversals = sumCents(
      events.filter((event) => event.type === 'reversal'),
      (event) => event.amount,
    )
    const baseline = toCents(lifecycle.baselinePaidAmount)
    const reported = [
      invoice.purchaseTotal,
      invoice.total,
      lifecycle.purchaseTotal,
      lifecycle.adjustmentTotal,
      lifecycle.invoiceTotal,
      lifecycle.paidAmount,
      lifecycle.remainingAmount,
      lifecycle.creditAmount,
    ].map(toCents)

    if (
      [purchase, adjustments, payments, reversals, baseline, ...reported].some(
        (value) => value === null,
      )
    ) {
      summary.inconclusive++
      continue
    }

    const expectedTotal = Math.max(0, purchase + adjustments)
    const expectedPaid = Math.max(0, baseline + payments - reversals)
    const expectedRemaining = Math.max(0, expectedTotal - expectedPaid)
    const expectedCredit = Math.max(0, expectedPaid - expectedTotal)
    const expected = [
      purchase,
      expectedTotal,
      purchase,
      adjustments,
      expectedTotal,
      expectedPaid,
      expectedRemaining,
      expectedCredit,
    ]

    if (reported.some((value, index) => value !== expected[index])) {
      summary.divergent++
    } else {
      summary.checked++
    }
  }
  return summary
}
