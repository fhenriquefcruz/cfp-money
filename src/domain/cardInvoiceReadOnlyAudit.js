// Conferencia aritmetica local e somente leitura.
const cents = (value) => {
  const type = typeof value
  if ((type !== 'number' && type !== 'string') || (type === 'string' && !value.trim())) {
    return null
  }
  const amount = Math.round(Number(value) * 100)
  return Number.isSafeInteger(amount) ? amount : null
}

export function auditLoadedCardInvoices(invoices = []) {
  const result = { total: 0, checked: 0, divergent: 0, inconclusive: 0 }
  for (const invoice of invoices) {
    const { items, events, lifecycle } = invoice || {}
    if (Array.isArray(items) && Array.isArray(events) && !items.length && !events.length) continue
    result.total++
    if (!Array.isArray(items) || !Array.isArray(events) || !lifecycle) {
      result.inconclusive++
      continue
    }
    const entries = events.filter((event) => event?.type !== 'manual_close')
    const values = [
      ...items.map((item) => item?.amount),
      ...entries.map((event) => (event.type === 'adjustment' ? event.signedAmount : event.amount)),
      invoice.purchaseTotal,
      invoice.total,
      lifecycle.paidAmount,
      lifecycle.remainingAmount,
      lifecycle.creditAmount,
      lifecycle.baselinePaidAmount,
    ].map(cents)
    if (
      values.includes(null) ||
      events.some(
        (event) => !['payment', 'reversal', 'adjustment', 'manual_close'].includes(event?.type),
      )
    ) {
      result.inconclusive++
      continue
    }
    const purchase = values.slice(0, items.length).reduce((sum, amount) => sum + amount, 0)
    const totals = { adjustment: 0, payment: 0, reversal: 0 }
    entries.forEach((event, i) => {
      totals[event.type] += values[items.length + i]
    })
    const [recordedPurchase, total, paid, remaining, credit, baseline] = values.slice(-6)
    const expectedTotal = Math.max(0, purchase + totals.adjustment)
    const expectedPaid = Math.max(0, baseline + totals.payment - totals.reversal)
    if (![purchase, expectedTotal, expectedPaid].every(Number.isSafeInteger)) {
      result.inconclusive++
      continue
    }
    const valid =
      recordedPurchase === purchase &&
      total === expectedTotal &&
      paid === expectedPaid &&
      remaining === Math.max(0, total - paid) &&
      credit === Math.max(0, paid - total)
    result[valid ? 'checked' : 'divergent']++
  }
  return result
}
