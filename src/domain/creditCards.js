function clampDay(day) {
  const value = Number(day)
  if (!Number.isFinite(value)) return 1
  return Math.min(31, Math.max(1, Math.trunc(value)))
}

function asLocalDate(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('Data inválida.')
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function dateWithClampedDay(year, monthIndex, day) {
  return new Date(year, monthIndex, Math.min(clampDay(day), daysInMonth(year, monthIndex)))
}

function addMonthsWithDay(value, amount, preferredDay) {
  const date = asLocalDate(value)
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  return dateWithClampedDay(target.getFullYear(), target.getMonth(), preferredDay)
}

function toIsoDate(value) {
  const date = asLocalDate(value)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function toMonthKey(value) {
  const date = asLocalDate(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function normalizeCreditCard(card = {}) {
  return {
    id: card.id || null,
    name: String(card.name || '').trim(),
    last4: String(card.last4 || '')
      .replace(/\D/g, '')
      .slice(-4),
    closingDay: clampDay(card.closingDay),
    dueDay: clampDay(card.dueDay),
    active: card.active !== false,
  }
}

export function calculateInvoiceSchedule(purchaseDate, rawCard) {
  const purchase = asLocalDate(purchaseDate)
  const card = normalizeCreditCard(rawCard)

  const closingMonthOffset = purchase.getDate() > card.closingDay ? 1 : 0

  const closingMonth = new Date(purchase.getFullYear(), purchase.getMonth() + closingMonthOffset, 1)

  const closingDate = dateWithClampedDay(
    closingMonth.getFullYear(),
    closingMonth.getMonth(),
    card.closingDay,
  )

  const dueMonthOffset = card.dueDay > card.closingDay ? 0 : 1
  const dueDate = dateWithClampedDay(
    closingDate.getFullYear(),
    closingDate.getMonth() + dueMonthOffset,
    card.dueDay,
  )

  return {
    purchaseDate: toIsoDate(purchase),
    closingDate: toIsoDate(closingDate),
    dueDate: toIsoDate(dueDate),
    invoiceMonth: toMonthKey(dueDate),
  }
}

export function splitInstallmentAmounts(totalAmount, installments) {
  const count = Math.max(1, Math.trunc(Number(installments) || 1))
  const totalCents = Math.round(Number(totalAmount) * 100)

  if (!Number.isFinite(totalCents) || totalCents <= 0) {
    throw new Error('Valor total inválido.')
  }

  const base = Math.floor(totalCents / count)
  const remainder = totalCents - base * count

  return Array.from({ length: count }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100)
}

export function buildCreditTransaction({ baseData, totalAmount, purchaseDate, card: rawCard }) {
  const card = normalizeCreditCard(rawCard)
  const schedule = calculateInvoiceSchedule(purchaseDate, card)

  return {
    ...baseData,
    type: 'expense',
    amount: Number(totalAmount),
    date: schedule.dueDate,
    purchaseDate: schedule.purchaseDate,
    originalPurchaseDate: schedule.purchaseDate,
    invoiceClosingDate: schedule.closingDate,
    dueDate: schedule.dueDate,
    invoiceMonth: schedule.invoiceMonth,
    paymentMethod: 'credit_card',
    cardId: card.id,
    cardName: card.name,
    cardLast4: card.last4,
    cardClosingDay: card.closingDay,
    cardDueDay: card.dueDay,
    isCreditPurchase: true,
  }
}

export function buildInstallmentTransactions({
  baseData,
  totalAmount,
  installments,
  purchaseDate,
  card: rawCard,
  groupId,
}) {
  const card = normalizeCreditCard(rawCard)
  const schedule = calculateInvoiceSchedule(purchaseDate, card)
  const amounts = splitInstallmentAmounts(totalAmount, installments)
  const resolvedGroupId = groupId || `${Date.now()}_${Math.random().toString(36).slice(2)}`

  return amounts.map((amount, index) => {
    const dueDate = addMonthsWithDay(schedule.dueDate, index, card.dueDay)

    return {
      ...baseData,
      type: 'expense',
      amount,
      date: toIsoDate(dueDate),
      purchaseDate: schedule.purchaseDate,
      originalPurchaseDate: schedule.purchaseDate,
      invoiceClosingDate:
        index === 0
          ? schedule.closingDate
          : toIsoDate(addMonthsWithDay(schedule.closingDate, index, card.closingDay)),
      dueDate: toIsoDate(dueDate),
      invoiceMonth: toMonthKey(dueDate),
      paymentMethod: 'credit_card',
      cardId: card.id,
      cardName: card.name,
      cardLast4: card.last4,
      cardClosingDay: card.closingDay,
      cardDueDay: card.dueDay,
      isCreditPurchase: true,
      isInstallment: true,
      installmentNum: index + 1,
      installmentOf: amounts.length,
      installmentGroupId: resolvedGroupId,
      originalAmount: Number(totalAmount),
    }
  })
}
