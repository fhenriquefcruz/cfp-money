// Auditoria aritmetica local: sem Firebase e sem escrita.
function cents(value) {
  if (
    !['string', 'number'].includes(typeof value) ||
    (typeof value === 'string' && !value.trim())
  ) return null
  const n = Math.round(Number(value) * 100)
  return Number.isSafeInteger(n) ? n : null
}

export function auditLoadedCardInvoices(invoices = []) {
  const summary = { total: 0, checked: 0, divergent: 0, inconclusive: 0 }
  for (const invoice of invoices) {
    const { items, events, lifecycle } = invoice || {}
    if (Array.isArray(items) && Array.isArray(events) && !items.length && !events.length) {
      continue
    }
    summary.total++
    if (
      !Array.isArray(items) ||
      !Array.isArray(events) ||
      !lifecycle ||
      events.some((event) => !['payment', 'reversal', 'adjustment', 'manual_close'].includes(event?.type))
    ) {
      summary.inconclusive++
      continue
    }

    const movements = events.filter((event) => event.type !== 'manual_close')
    const values = [
      ...items.map((item) => item?.amount),
      ...movements.map((event) =>
        event.type === 'adjustment' ? event.signedAmount : event.amount,
      ),
      invoice.purchaseTotal,
      invoice.total,
      lifecycle.paidAmount,
      lifecycle.remainingAmount,
      lifecycle.creditAmount,
      lifecycle.baselinePaidAmount,
    ].map(cents)
    if (values.includes(null)) {
      summary.inconclusive++
      continue
    }

    const purchase = values.slice(0, items.length).reduce((sum, value) => sum + value, 0)
    const totals = { adjustment: 0, payment: 0, reversal: 0 }
    movements.forEach((event, index) => {
      totals[event.type] += values[items.length + index]
    })
    const [recordedPurchase, recordedTotal, paid, remaining, credit, baseline] = values.slice(-6)
    const due = Math.max(0, purchase + totals.adjustment)
    const expectedPaid = Math.max(0, baseline + totals.payment - totals.reversal)
    if (![purchase, due, expectedPaid].every(Number.isSafeInteger)) {
      summary.inconclusive++
      continue
    }
    const consistent =
      recordedPurchase === purchase &&
      recordedTotal === due &&
      paid === expectedPaid &&
      remaining === Math.max(0, due - paid) &&
      credit === Math.max(0, paid - due)
    summary[consistent ? 'checked' : 'divergent']++
  }
  return summary
}
