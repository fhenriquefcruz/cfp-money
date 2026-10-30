// Conferencia local e somente leitura: valores invalidos nunca equivalem a zero.
function cents(raw) {
  if (
    (typeof raw !== 'string' && typeof raw !== 'number') ||
    (typeof raw === 'string' && !raw.trim())
  ) return null
  const value = Math.round(Number(raw) * 100)
  return Number.isSafeInteger(value) ? value : null
}

function total(values) {
  let result = 0
  for (const value of values) {
    const amount = cents(value)
    if (amount === null) return null
    result += amount
  }
  return Number.isSafeInteger(result) ? result : null
}

export function auditLoadedCardInvoices(invoices = []) {
  const result = { total: 0, checked: 0, divergent: 0, inconclusive: 0 }
  for (const invoice of invoices) {
    const { items, events, lifecycle } = invoice || {}
    if (Array.isArray(items) && Array.isArray(events) && !items.length && !events.length) {
      continue
    }
    result.total++
    if (
      !Array.isArray(items) ||
      !Array.isArray(events) ||
      !lifecycle ||
      events.some((event) => !['payment', 'reversal', 'adjustment', 'manual_close'].includes(event?.type))
    ) {
      result.inconclusive++
      continue
    }

    const purchase = total(items.map((item) => item?.amount))
    const [adjustments, payments, reversals] = ['adjustment', 'payment', 'reversal'].map(
      (type) =>
        total(
          events
            .filter((event) => event.type === type)
            .map((event) => event[type === 'adjustment' ? 'signedAmount' : 'amount']),
        ),
    )
    const baseline = cents(lifecycle.baselinePaidAmount)
    const reported = [
      invoice.purchaseTotal,
      invoice.total,
      lifecycle.paidAmount,
      lifecycle.remainingAmount,
      lifecycle.creditAmount,
    ].map(cents)
    if ([purchase, adjustments, payments, reversals, baseline, ...reported].includes(null)) {
      result.inconclusive++
      continue
    }

    const invoiceTotal = Math.max(0, purchase + adjustments)
    const paid = Math.max(0, baseline + payments - reversals)
    const expected = [
      purchase,
      invoiceTotal,
      paid,
      Math.max(0, invoiceTotal - paid),
      Math.max(0, paid - invoiceTotal),
    ]
    result[reported.some((value, index) => value !== expected[index]) ? 'divergent' : 'checked']++
  }
  return result
}
