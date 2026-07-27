function pad(value) {
  return String(value).padStart(2, '0')
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function clampDay(year, monthIndex, day) {
  return Math.min(
    daysInMonth(year, monthIndex),
    Math.max(1, Number(day) || 1),
  )
}

function isoDate(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(
    clampDay(year, monthIndex, day),
  )}`
}

export function monthKeyFromDate(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}/.test(value)) {
    return value.slice(0, 7)
  }

  const date = value instanceof Date ? value : new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function shiftMonthKey(monthKey, amount) {
  const [year, month] = monthKey.split('-').map(Number)
  return monthKeyFromDate(new Date(year, month - 1 + amount, 1))
}

export function labelForMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))

  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function invoiceDatesForMonth(monthKey, rawCard = {}) {
  const [year, month] = monthKey.split('-').map(Number)
  const dueMonthIndex = month - 1
  const dueDay = Number(rawCard.dueDay) || 1
  const closingDay = Number(rawCard.closingDay) || 1
  const closingMonthOffset = dueDay > closingDay ? 0 : -1
  const closingReference = new Date(year, dueMonthIndex + closingMonthOffset, 1)

  return {
    closingDate: isoDate(
      closingReference.getFullYear(),
      closingReference.getMonth(),
      closingDay,
    ),
    dueDate: isoDate(year, dueMonthIndex, dueDay),
  }
}

export function invoiceStatus(monthKey, card, now = new Date()) {
  const currentMonth = monthKeyFromDate(now)
  const today = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join('-')
  const dates = invoiceDatesForMonth(monthKey, card)

  if (monthKey > currentMonth) return 'future'
  if (dates.dueDate < today) return 'past_due'
  if (dates.dueDate === today) return 'due_today'
  if (dates.closingDate < today) return 'closed'
  return 'forming'
}

export function isStructuredCreditTransaction(transaction = {}) {
  return Boolean(
    transaction.type === 'expense' &&
      transaction.paymentMethod === 'credit_card' &&
      transaction.isCreditPurchase &&
      transaction.cardId,
  )
}

function transactionInvoiceMonth(transaction) {
  return (
    transaction.invoiceMonth ||
    transaction.dueDate?.slice(0, 7) ||
    transaction.date?.slice(0, 7) ||
    ''
  )
}

function cardSnapshotFromTransaction(transaction) {
  return {
    id: transaction.cardId,
    name: transaction.cardName || 'Cartão removido',
    last4: transaction.cardLast4 || '',
    closingDay: Number(transaction.cardClosingDay) || 1,
    dueDay: Number(transaction.cardDueDay) || 1,
    active: false,
    historicalOnly: true,
  }
}

function sum(items) {
  return items.reduce((total, item) => total + Number(item.amount || 0), 0)
}

export function buildCreditCardCenter({
  transactions = [],
  creditCards = [],
  selectedMonth = monthKeyFromDate(),
  now = new Date(),
  forecastMonths = 6,
}) {
  const structured = transactions.filter(isStructuredCreditTransaction)
  const legacy = transactions.filter(
    (transaction) =>
      transaction.type === 'expense' &&
      transaction.paymentMethod === 'credit_card' &&
      !isStructuredCreditTransaction(transaction),
  )

  const cardMap = new Map(
    creditCards.map((card) => [
      card.id,
      { ...card, historicalOnly: false },
    ]),
  )

  structured.forEach((transaction) => {
    if (!cardMap.has(transaction.cardId)) {
      cardMap.set(transaction.cardId, cardSnapshotFromTransaction(transaction))
    }
  })

  const cards = [...cardMap.values()].sort((a, b) => {
    if (a.active !== false && b.active === false) return -1
    if (a.active === false && b.active !== false) return 1
    return String(a.name).localeCompare(String(b.name), 'pt-BR')
  })

  const selectedTransactions = structured
    .filter(
      (transaction) =>
        transactionInvoiceMonth(transaction) === selectedMonth,
    )
    .sort((a, b) => {
      const firstDate = a.purchaseDate || a.originalPurchaseDate || a.date
      const secondDate = b.purchaseDate || b.originalPurchaseDate || b.date
      return String(secondDate).localeCompare(String(firstDate))
    })

  const invoices = cards.map((card) => {
    const items = selectedTransactions.filter(
      (transaction) => transaction.cardId === card.id,
    )
    const dates = invoiceDatesForMonth(selectedMonth, card)

    return {
      card,
      items,
      total: sum(items),
      itemCount: items.length,
      installmentCount: items.filter((item) => item.isInstallment).length,
      dates,
      status: items.length
        ? invoiceStatus(selectedMonth, card, now)
        : 'empty',
    }
  })

  const forecast = Array.from(
    { length: Math.max(1, forecastMonths) },
    (_, index) => {
      const month = shiftMonthKey(selectedMonth, index)
      const items = structured.filter(
        (transaction) =>
          transactionInvoiceMonth(transaction) === month,
      )

      return {
        month,
        label: labelForMonth(month),
        total: sum(items),
        itemCount: items.length,
      }
    },
  )

  const futureInstallments = structured.filter(
    (transaction) =>
      transaction.isInstallment &&
      transactionInvoiceMonth(transaction) > selectedMonth,
  )

  const selectedLegacy = legacy.filter(
    (transaction) => transaction.date?.slice(0, 7) === selectedMonth,
  )

  return {
    selectedMonth,
    selectedMonthLabel: labelForMonth(selectedMonth),
    cards,
    invoices,
    selectedTransactions,
    selectedTotal: sum(selectedTransactions),
    selectedItemCount: selectedTransactions.length,
    cardsWithTransactions: invoices.filter((invoice) => invoice.itemCount > 0)
      .length,
    futureInstallmentCount: futureInstallments.length,
    futureInstallmentTotal: sum(futureInstallments),
    legacyCount: selectedLegacy.length,
    legacyTotal: sum(selectedLegacy),
    forecast,
    forecastMax: Math.max(1, ...forecast.map((item) => item.total)),
  }
}
