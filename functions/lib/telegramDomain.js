const DEFAULT_TIME_ZONE = 'America/Campo_Grande'

function toCents(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0
}

function fromCents(value) {
  return value / 100
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function datePartsInTimeZone(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date)

  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

function isoDateInTimeZone(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = datePartsInTimeZone(date, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

function addDaysIso(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function monthKey(isoDate) {
  return String(isoDate || '').slice(0, 7)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

function parseBrazilianAmount(message = '') {
  const match = String(message).match(
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)/i,
  )

  if (!match) return 0

  let raw = match[1]

  if (raw.includes(',') && raw.includes('.')) {
    raw = raw.replace(/\./g, '').replace(',', '.')
  } else if (raw.includes(',')) {
    raw = raw.replace(',', '.')
  }

  return fromCents(toCents(Number(raw)))
}

function inferType(message = '') {
  const normalized = normalizeText(message)

  if (/\b(recebi|ganhei|entrou|salario|pagamento recebido|renda)\b/.test(normalized)) {
    return 'income'
  }

  if (/\b(gastei|paguei|comprei|custou|despesa|saida)\b/.test(normalized)) {
    return 'expense'
  }

  return ''
}

function inferPaymentMethod(message = '') {
  const normalized = normalizeText(message)

  if (/\bpix\b/.test(normalized)) return 'pix'
  if (/\bdebito\b/.test(normalized)) return 'debit_card'
  if (/\bdinheiro\b|\bespecie\b/.test(normalized)) return 'cash'
  if (/\btransferencia\b|\bted\b|\bdoc\b/.test(normalized)) {
    return 'transfer'
  }
  if (/\bcartao\b|\bcredito\b/.test(normalized)) {
    return 'credit_card'
  }

  return 'other'
}

function inferCategory(message = '', type = 'expense') {
  const normalized = normalizeText(message)
  const expenseRules = [
    ['Alimentação', /\b(mercado|restaurante|lanche|comida|almoco|jantar|ifood)\b/],
    ['Transporte', /\b(uber|99|combustivel|gasolina|onibus|transporte|estacionamento)\b/],
    ['Moradia', /\b(aluguel|condominio|energia|luz|agua|internet|moradia)\b/],
    ['Saúde', /\b(medico|dentista|farmacia|remedio|saude|academia)\b/],
    ['Lazer', /\b(cinema|viagem|show|lazer|bar|festa)\b/],
    ['Educação', /\b(curso|livro|faculdade|escola|educacao)\b/],
  ]
  const incomeRules = [
    ['Salário', /\b(salario|pagamento|holerite)\b/],
    ['Renda extra', /\b(freela|freelance|extra|venda|comissao)\b/],
  ]
  const rules = type === 'income' ? incomeRules : expenseRules

  return (
    rules.find(([, pattern]) => pattern.test(normalized))?.[0] ||
    (type === 'income' ? 'Outras receitas' : 'Outras despesas')
  )
}

function cleanDescription(message = '', amount = 0) {
  let description = String(message)
    .replace(/\/\w+/g, ' ')
    .replace(/r\$\s*/gi, ' ')
    .replace(/(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)/g, ' ')
    .replace(
      /\b(gastei|paguei|comprei|custou|recebi|ganhei|entrou|por|no|na|via|hoje|ontem|pix|debito|crédito|credito|dinheiro|transferencia)\b/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()

  if (!description) {
    description = amount > 0 ? 'Lançamento pelo Telegram' : 'Lançamento'
  }

  return description.charAt(0).toUpperCase() + description.slice(1)
}

function findCard(message = '', creditCards = []) {
  const normalized = normalizeText(message)

  return creditCards.find((card) => {
    const cardName = normalizeText(card.name)
    const last4 = String(card.last4 || '')
    return (cardName && normalized.includes(cardName)) || (last4 && normalized.includes(last4))
  })
}

function parseInstallments(message = '') {
  const normalized = normalizeText(message)
  const match =
    normalized.match(/\b(\d{1,2})\s*x\b/) || normalized.match(/\bem\s+(\d{1,2})\s+vezes?\b/)

  if (!match) return 1

  const count = Number(match[1])
  return Number.isInteger(count) && count >= 1 && count <= 24 ? count : 1
}

function splitInstallments(total, count) {
  const totalCents = toCents(total)
  const base = Math.floor(totalCents / count)
  const remainder = totalCents % count

  return Array.from({ length: count }, (_, index) => fromCents(base + (index < remainder ? 1 : 0)))
}

function invoiceDueDate(purchaseDate, card, installmentOffset = 0) {
  const [year, month, day] = purchaseDate.split('-').map(Number)
  const closingDay = Number(card.closingDay) || 1
  const dueDay = Number(card.dueDay) || 1
  const closingMonthOffset = day > closingDay ? 1 : 0
  const dueAfterClosingOffset = dueDay <= closingDay ? 1 : 0
  const target = new Date(
    Date.UTC(
      year,
      month - 1 + closingMonthOffset + dueAfterClosingOffset + installmentOffset,
      1,
      12,
    ),
  )
  const maxDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()

  const due = Math.min(Math.max(1, dueDay), maxDay)

  return [
    target.getUTCFullYear(),
    String(target.getUTCMonth() + 1).padStart(2, '0'),
    String(due).padStart(2, '0'),
  ].join('-')
}

function parseMoneyMessage({
  message,
  creditCards = [],
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
}) {
  const amount = parseBrazilianAmount(message)
  const type = inferType(message)
  const inferredPaymentMethod = inferPaymentMethod(message)
  const purchaseDate = isoDateInTimeZone(now, timeZone)
  const matchedCard = type === 'expense' ? findCard(message, creditCards) : null
  const paymentMethod = matchedCard ? 'credit_card' : inferredPaymentMethod
  const card = paymentMethod === 'credit_card' ? matchedCard : null
  const installments = card ? parseInstallments(message) : 1

  if (!amount || !type) {
    return {
      ok: false,
      reason: 'Não consegui identificar ao mesmo tempo o tipo e o valor do lançamento.',
    }
  }

  if (paymentMethod === 'credit_card' && !card) {
    return {
      ok: false,
      reason: 'Você mencionou cartão, mas não identifiquei qual cartão cadastrado deve ser usado.',
      needsCard: true,
    }
  }

  return {
    ok: true,
    draft: {
      kind: card ? 'credit_purchase' : 'transaction',
      type,
      amount,
      description: cleanDescription(message, amount),
      categoryName: inferCategory(message, type),
      paymentMethod,
      date: purchaseDate,
      purchaseDate,
      installments,
      card: card
        ? {
            id: card.id,
            name: card.name || '',
            last4: card.last4 || '',
            closingDay: Number(card.closingDay) || 1,
            dueDay: Number(card.dueDay) || 1,
          }
        : null,
    },
  }
}

function buildPeriod(moneySettings = {}, now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const today = isoDateInTimeZone(now, timeZone)
  const [year, month, day] = today.split('-').map(Number)
  const cycleType = moneySettings.cycleType || 'calendar_month'
  const startDay =
    cycleType === 'calendar_month'
      ? 1
      : Math.min(28, Math.max(1, Number(moneySettings.cycleStartDay) || 1))

  let startYear = year
  let startMonth = month

  if (day < startDay) {
    startMonth -= 1
    if (startMonth === 0) {
      startMonth = 12
      startYear -= 1
    }
  }

  const start = `${startYear}-${String(startMonth).padStart(
    2,
    '0',
  )}-${String(startDay).padStart(2, '0')}`

  let nextMonth = startMonth + 1
  let nextYear = startYear
  if (nextMonth === 13) {
    nextMonth = 1
    nextYear += 1
  }

  const nextStart = `${nextYear}-${String(nextMonth).padStart(
    2,
    '0',
  )}-${String(startDay).padStart(2, '0')}`

  return {
    start,
    end: addDaysIso(nextStart, -1),
    today,
    month: monthKey(today),
  }
}

function summarizeTransactions(transactions = []) {
  return transactions.reduce(
    (summary, transaction) => {
      const amount = Number(transaction.amount || 0)

      if (transaction.isSavings) {
        summary.savings += amount
      } else if (transaction.type === 'income') {
        summary.income += amount
      } else if (transaction.type === 'expense') {
        summary.expenses += amount
      }

      summary.balance = summary.income - summary.expenses
      summary.count += 1
      return summary
    },
    {
      income: 0,
      expenses: 0,
      savings: 0,
      balance: 0,
      count: 0,
    },
  )
}

function buildTransactionDocuments(draft, groupId) {
  if (draft.kind !== 'credit_purchase') {
    return [
      {
        description: draft.description,
        amount: draft.amount,
        type: draft.type,
        date: draft.date,
        categoryId: '',
        categoryName: draft.categoryName,
        paymentMethod: draft.paymentMethod,
        isSavings: false,
        source: 'telegram',
      },
    ]
  }

  const amounts = splitInstallments(draft.amount, draft.installments)

  return amounts.map((amount, index) => {
    const dueDate = invoiceDueDate(draft.purchaseDate, draft.card, index)

    return {
      description: draft.description,
      amount,
      type: 'expense',
      date: dueDate,
      dueDate,
      invoiceMonth: dueDate.slice(0, 7),
      purchaseDate: draft.purchaseDate,
      originalPurchaseDate: draft.purchaseDate,
      categoryId: '',
      categoryName: draft.categoryName,
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      cardId: draft.card.id,
      cardName: draft.card.name,
      cardLast4: draft.card.last4,
      cardClosingDay: draft.card.closingDay,
      cardDueDay: draft.card.dueDay,
      isInstallment: draft.installments > 1,
      installmentNum: index + 1,
      installmentOf: draft.installments,
      installmentGroupId: groupId,
      originalAmount: draft.amount,
      isSavings: false,
      source: 'telegram',
    }
  })
}

module.exports = {
  DEFAULT_TIME_ZONE,
  addDaysIso,
  buildPeriod,
  buildTransactionDocuments,
  formatCurrency,
  inferCategory,
  invoiceDueDate,
  isoDateInTimeZone,
  parseBrazilianAmount,
  parseMoneyMessage,
  splitInstallments,
  summarizeTransactions,
}
