import { buildInvoiceLifecycle, getInvoiceEvents } from './invoiceLifecycle'

function pad(value) {
  return String(value).padStart(2, '0')
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function clampDay(year, monthIndex, day) {
  return Math.min(daysInMonth(year, monthIndex), Math.max(1, Number(day) || 1))
}

function isoDate(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(clampDay(year, monthIndex, day))}`
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

export function firstRelevantForecastMonth(forecast = [], selectedMonth = '') {
  const relevant = forecast.find(
    (item) => item.month !== selectedMonth && Number(item.itemCount || 0) > 0,
  )
  return relevant?.month || ''
}

// Preferir a última fatura anterior; se não existir, buscar a próxima.
export function firstRelevantRecordedMonth(months = [], selected = '') {
  return months.filter((month) => month < selected).at(-1) || months.find((month) => month > selected) || ''
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
    closingDate: isoDate(closingReference.getFullYear(), closingReference.getMonth(), closingDay),
    dueDate: isoDate(year, dueMonthIndex, dueDay),
  }
}

export function invoiceStatus(monthKey, card, now = new Date()) {
  const currentMonth = monthKeyFromDate(now)
  const today = [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-')
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
    !transaction.isSavings &&
    transaction.cardId &&
    transaction.paymentStatus !== 'cancelled',
  )
}

function inferInvoiceMonth(date, card = {}) {
  if (!date) return ''
  const closingDay = Number(card.closingDay) || 1
  const offset =
    (Number(String(date).slice(8, 10)) > closingDay ? 1 : 0) +
    ((Number(card.dueDay) || 1) <= closingDay ? 1 : 0)

  return shiftMonthKey(String(date).slice(0, 7), offset)
}

export function resolveCreditTransactionInvoiceMonth(transaction, card) {
  const explicitMonth = transaction.invoiceMonth || transaction.dueDate?.slice(0, 7)
  if (explicitMonth) return explicitMonth

  const purchaseDate =
    transaction.purchaseDate || transaction.originalPurchaseDate || transaction.date

  return inferInvoiceMonth(purchaseDate, card) || transaction.date?.slice(0, 7) || ''
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

function sum(items, selector = (item) => item.amount) {
  const cents = items.reduce(
    (total, item) => total + Math.round(Number(selector(item) || 0) * 100),
    0,
  )

  return cents / 100
}

// Conciliação de leitura para registros antigos sem identificador estável de cartão.
// Não altera transações no banco e nunca escolhe entre cartões ambíguos.
function normalizeCardName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function reconcileCardTransaction(transaction, creditCards) {
  if (
    transaction.type !== 'expense' ||
    transaction.isSavings ||
    transaction.paymentStatus === 'cancelled'
  ) {
    return transaction
  }

  const isCardPurchase = Boolean(
    transaction.cardId ||
    transaction.paymentMethod === 'credit_card' ||
    transaction.isCreditPurchase,
  )
  if (!isCardPurchase || creditCards.some((card) => card.id === transaction.cardId)) {
    return transaction
  }

  const last4 = String(transaction.cardLast4 || '')
    .replace(/\D/g, '')
    .slice(-4)
  const recordedName = normalizeCardName(transaction.cardName)
  const recordedIdAsName = normalizeCardName(transaction.cardId)
  let match = null

  if (last4.length === 4) {
    const sameLast4 = creditCards.filter(
      (card) =>
        String(card.last4 || '')
          .replace(/\D/g, '')
          .slice(-4) === last4 &&
        (!recordedName || normalizeCardName(card.name) === recordedName),
    )
    if (sameLast4.length === 1) match = sameLast4[0]
  }

  if (!match && (recordedName || recordedIdAsName)) {
    const sameName = creditCards.filter((card) => {
      const name = normalizeCardName(card.name)
      return (
        name &&
        (name === recordedName || name === recordedIdAsName) &&
        (!transaction.cardId || recordedIdAsName === name)
      )
    })
    if (sameName.length === 1) match = sameName[0]
  }

  if (!match) return transaction
  return {
    ...transaction,
    cardId: match.id,
    cardName: match.name,
    cardLast4: match.last4 || transaction.cardLast4 || '',
  }
}

export function buildCreditCardCenter({
  transactions = [],
  creditCards = [],
  invoiceEvents = [],
  selectedMonth = monthKeyFromDate(),
  now = new Date(),
  forecastMonths = 6,
}) {
  const reconciledTransactions = transactions.map((transaction) =>
    reconcileCardTransaction(transaction, creditCards),
  )
  const reconciledPurchaseCount = reconciledTransactions.filter(
    (transaction, index) => transaction !== transactions[index],
  ).length
  const structured = reconciledTransactions.filter(isStructuredCreditTransaction)
  const legacy = reconciledTransactions.filter(
    (transaction) =>
      transaction.type === 'expense' &&
      !transaction.isSavings &&
      transaction.paymentMethod === 'credit_card' &&
      !transaction.cardId &&
      transaction.paymentStatus !== 'cancelled',
  )

  const cardMap = new Map(
    creditCards.map((card) => [
      card.id,
      {
        ...card,
        historicalOnly: false,
      },
    ]),
  )

  structured.forEach((transaction) => {
    if (!cardMap.has(transaction.cardId)) {
      cardMap.set(transaction.cardId, cardSnapshotFromTransaction(transaction))
    }
  })

  invoiceEvents.forEach((event) => {
    if (!event.cardId || cardMap.has(event.cardId)) return

    cardMap.set(event.cardId, {
      id: event.cardId,
      name: event.cardName || 'Cartão removido',
      last4: event.cardLast4 || '',
      closingDay: 1,
      dueDay: 1,
      active: false,
      historicalOnly: true,
    })
  })

  const cards = [...cardMap.values()].sort((first, second) => {
    if (first.active !== false && second.active === false) {
      return -1
    }
    if (first.active === false && second.active !== false) {
      return 1
    }

    return String(first.name).localeCompare(String(second.name), 'pt-BR')
  })

  // Localiza competências reais em todo o histórico, não somente na previsão.
  const availableInvoiceMonths = [
    ...new Set([
      ...structured.map((tx) =>
        resolveCreditTransactionInvoiceMonth(tx, cardMap.get(tx.cardId)),
      ),
      ...invoiceEvents.filter((event) => event.cardId).map((event) => event.invoiceMonth),
    ]),
  ]
    .filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    .sort()

  const selectedTransactions = structured
    .filter(
      (transaction) =>
        resolveCreditTransactionInvoiceMonth(transaction, cardMap.get(transaction.cardId)) ===
        selectedMonth,
    )
    .sort((first, second) => {
      const firstDate = first.purchaseDate || first.originalPurchaseDate || first.date
      const secondDate = second.purchaseDate || second.originalPurchaseDate || second.date

      return String(secondDate).localeCompare(String(firstDate))
    })

  const invoices = cards.map((card) => {
    const items = selectedTransactions.filter((transaction) => transaction.cardId === card.id)
    const dates = invoiceDatesForMonth(selectedMonth, card)
    const events = getInvoiceEvents(invoiceEvents, card.id, selectedMonth)
    const purchaseTotal = sum(items)
    const hasManualPaymentEvents = events.some(
      (event) => event.type === 'payment' || event.type === 'reversal',
    )
    const transactionPaidTotal = hasManualPaymentEvents
      ? 0
      : sum(
          items.filter(
            (transaction) => transaction.paymentStatus === 'paid' || transaction.isPaid === true,
          ),
        )
    const temporalStatus = items.length ? invoiceStatus(selectedMonth, card, now) : 'empty'
    const lifecycle = buildInvoiceLifecycle({
      purchaseTotal,
      baselinePaidAmount: transactionPaidTotal,
      events,
      closingDate: dates.closingDate,
      dueDate: dates.dueDate,
      temporalStatus,
      now,
    })

    // Compromissos futuros derivam dos lançamentos conciliados, sem somar
    // novamente compras já incluídas na fatura selecionada.
    const futureCommitmentTotal = sum(
      structured.filter(
        (transaction) =>
          transaction.cardId === card.id &&
          resolveCreditTransactionInvoiceMonth(transaction, card) > selectedMonth,
      ),
    )

    return {
      card,
      items,
      total: lifecycle.invoiceTotal,
      purchaseTotal,
      itemCount: items.length,
      installmentCount: items.filter((item) => item.isInstallment).length,
      futureCommitmentTotal,
      dates,
      events,
      lifecycle,
      paymentSource: hasManualPaymentEvents
        ? 'invoice_events'
        : transactionPaidTotal > 0
          ? 'transactions'
          : 'none',
      status: lifecycle.status,
    }
  })

  const forecast = Array.from(
    {
      length: Math.max(1, forecastMonths),
    },
    (_, index) => {
      const month = shiftMonthKey(selectedMonth, index)
      const items = structured.filter(
        (transaction) =>
          resolveCreditTransactionInvoiceMonth(transaction, cardMap.get(transaction.cardId)) ===
          month,
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
      resolveCreditTransactionInvoiceMonth(transaction, cardMap.get(transaction.cardId)) >
        selectedMonth,
  )

  const selectedLegacy = legacy.filter(
    (transaction) => transaction.date?.slice(0, 7) === selectedMonth,
  )

  return {
    selectedMonth,
    availableInvoiceMonths,
    reconciledPurchaseCount,
    unlinkedPurchaseCount: legacy.length,
    unlinkedPurchaseTotal: sum(legacy),
    selectedMonthLabel: labelForMonth(selectedMonth),
    cards,
    invoices,
    selectedTransactions,
    selectedTotal: sum(invoices, (invoice) => invoice.lifecycle.invoiceTotal),
    selectedPurchaseTotal: sum(selectedTransactions),
    selectedPaidTotal: sum(invoices, (invoice) => invoice.lifecycle.paidAmount),
    selectedRemainingTotal: sum(invoices, (invoice) => invoice.lifecycle.remainingAmount),
    selectedCreditTotal: sum(invoices, (invoice) => invoice.lifecycle.creditAmount),
    selectedItemCount: selectedTransactions.length,
    cardsWithTransactions: invoices.filter(
      (invoice) => invoice.itemCount > 0 || invoice.events.length > 0,
    ).length,
    futureInstallmentCount: futureInstallments.length,
    futureInstallmentTotal: sum(futureInstallments),
    legacyCount: selectedLegacy.length,
    legacyTotal: sum(selectedLegacy),
    forecast,
    forecastMax: Math.max(1, ...forecast.map((item) => item.total)),
  }
}
