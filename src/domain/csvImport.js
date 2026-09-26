import Papa from 'papaparse'

export const CSV_IMPORT_MAX_ROWS = 400

const HEADER_ALIASES = {
  date: ['data', 'date'],
  type: ['tipo', 'type'],
  description: ['descricao', 'description'],
  category: ['categoria', 'category'],
  amount: ['valor', 'value', 'amount'],
  paymentMethod: ['forma de pagamento', 'pagamento', 'payment', 'payment method'],
  dueDate: ['vencimento', 'due date', 'duedate'],
  paymentStatus: ['status pagamento', 'status de pagamento', 'payment status'],
  paidAt: ['pago em', 'paid at'],
}

const PAYMENT_STATUS_ALIASES = new Map([
  ['unknown', 'unknown'],
  ['a revisar', 'unknown'],
  ['pending', 'pending'],
  ['pendente', 'pending'],
  ['paid', 'paid'],
  ['pago', 'paid'],
  ['cancelled', 'cancelled'],
  ['canceled', 'cancelled'],
  ['cancelado', 'cancelled'],
])

const TYPE_ALIASES = new Map([
  ['receita', { type: 'income', isSavings: false }],
  ['income', { type: 'income', isSavings: false }],
  ['despesa', { type: 'expense', isSavings: false }],
  ['expense', { type: 'expense', isSavings: false }],
  ['poupanca', { type: 'income', isSavings: true }],
  ['savings', { type: 'income', isSavings: true }],
])

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const normalizeHeader = (value) => normalizeText(value)

const findValue = (row, aliases) => {
  for (const alias of aliases) {
    const key = normalizeHeader(alias)
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return String(row[key] ?? '').trim()
    }
  }
  return ''
}

const parseDate = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T00:00:00`)
    return Number.isNaN(date.getTime()) ? '' : raw
  }

  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!match) return ''

  const [, day, month, year] = match
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const date = new Date(`${iso}T00:00:00`)

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return ''
  }

  return iso
}

const parseAmount = (value) => {
  const raw = String(value ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .trim()

  if (!raw) return NaN

  let normalized = raw

  if (raw.includes(',') && raw.includes('.')) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
      normalized = raw.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = raw.replace(/,/g, '')
    }
  } else if (raw.includes(',')) {
    normalized = raw.replace(',', '.')
  } else if ((raw.match(/\./g) || []).length > 1) {
    normalized = raw.replace(/\./g, '')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

const categoryKey = (value) => normalizeText(value)
const paymentKey = (value) => normalizeText(value)

const resolveCategory = (categoryName, categories = []) => {
  const key = categoryKey(categoryName)
  if (!key) return null

  return (
    categories.find(
      (category) =>
        categoryKey(category.name) === key ||
        categoryKey(category.id) === key,
    ) || null
  )
}

const resolvePaymentMethod = (value, paymentMethods = []) => {
  const key = paymentKey(value)
  if (!key) return paymentMethods.find((method) => method.id === 'pix')?.id || 'pix'

  return (
    paymentMethods.find(
      (method) => paymentKey(method.id) === key || paymentKey(method.label) === key,
    )?.id || null
  )
}

const buildDuplicateSignature = (transaction) =>
  [
    transaction.date,
    transaction.type,
    transaction.isSavings ? 'savings' : 'regular',
    Math.round(Number(transaction.amount || 0) * 100),
    normalizeText(transaction.description),
    normalizeText(transaction.categoryName),
  ].join('|')

const buildExistingSignatures = (transactions = []) =>
  new Set(transactions.map(buildDuplicateSignature))

const parsePaidAt = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return null

  const brDate = parseDate(raw)
  if (brDate) return new Date(`${brDate}T12:00:00`)

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const pushIssue = (issues, severity, code, message) => {
  issues.push({ severity, code, message })
}

export function buildCsvImportPreview(
  csvText,
  {
    categories = [],
    existingTransactions = [],
    paymentMethods = [],
    maxRows = CSV_IMPORT_MAX_ROWS,
  } = {},
) {
  const source = String(csvText || '').trim()

  if (!source) {
    return {
      fatalIssues: [{ code: 'empty_csv', message: 'Informe um arquivo ou conteúdo CSV.' }],
      rows: [],
      summary: { total: 0, ready: 0, warnings: 0, errors: 0, duplicates: 0 },
    }
  }

  const parsed = Papa.parse(source, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normalizeHeader,
  })

  const fields = (parsed.meta?.fields || []).map(normalizeHeader)
  const missingHeaders = ['date', 'type', 'amount'].filter((field) => {
    const aliases = HEADER_ALIASES[field].map(normalizeHeader)
    return !aliases.some((alias) => fields.includes(alias))
  })

  const fatalIssues = []

  if (missingHeaders.length) {
    fatalIssues.push({
      code: 'missing_headers',
      message: 'O CSV precisa conter as colunas Data, Tipo e Valor.',
    })
  }

  if (parsed.data.length > maxRows) {
    fatalIssues.push({
      code: 'too_many_rows',
      message: `O arquivo possui ${parsed.data.length} linhas. O limite seguro por importação é ${maxRows}.`,
    })
  }

  if (fatalIssues.length) {
    return {
      fatalIssues,
      rows: [],
      summary: { total: parsed.data.length, ready: 0, warnings: 0, errors: parsed.data.length, duplicates: 0 },
    }
  }

  const existingSignatures = buildExistingSignatures(existingTransactions)
  const previewSignatures = new Set()

  const rows = parsed.data.map((rawRow, index) => {
    const issues = []
    const rawType = findValue(rawRow, HEADER_ALIASES.type)
    const typeConfig = TYPE_ALIASES.get(normalizeText(rawType))
    const dateValue = findValue(rawRow, HEADER_ALIASES.date)
    const parsedDate = parseDate(dateValue)
    const rawAmount = findValue(rawRow, HEADER_ALIASES.amount)
    const amount = parseAmount(rawAmount)
    const description = findValue(rawRow, HEADER_ALIASES.description)
    const categoryName = findValue(rawRow, HEADER_ALIASES.category)
    const paymentLabel = findValue(rawRow, HEADER_ALIASES.paymentMethod)
    const resolvedCategory = resolveCategory(categoryName, categories)
    const paymentMethod = resolvePaymentMethod(paymentLabel, paymentMethods)

    if (!parsedDate) {
      pushIssue(issues, 'error', 'invalid_date', `Data inválida: "${dateValue || 'vazia'}".`)
    }

    if (!typeConfig) {
      pushIssue(
        issues,
        'error',
        'invalid_type',
        `Tipo inválido: "${rawType || 'vazio'}". Use Receita, Despesa ou Poupança.`,
      )
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      pushIssue(issues, 'error', 'invalid_amount', `Valor inválido: "${rawAmount || 'vazio'}".`)
    }

    const isSavings = Boolean(typeConfig?.isSavings)

    if (!isSavings && !categoryName) {
      pushIssue(issues, 'error', 'missing_category', 'Informe uma categoria para esta transação.')
    } else if (!isSavings && categoryName && !resolvedCategory) {
      pushIssue(
        issues,
        'warning',
        'unmatched_category',
        `A categoria "${categoryName}" não está cadastrada e será importada sem vínculo.`,
      )
    }

    if (paymentLabel && !paymentMethod) {
      pushIssue(
        issues,
        'warning',
        'unknown_payment_method',
        `Forma de pagamento "${paymentLabel}" não reconhecida; será usado PIX.`,
      )
    }

    const transaction = {
      date: parsedDate,
      type: typeConfig?.type || 'expense',
      isSavings,
      description,
      categoryId: isSavings ? '_savings' : resolvedCategory?.id || '',
      categoryName: isSavings ? 'Poupança' : resolvedCategory?.name || categoryName,
      categoryColor: isSavings ? '#c49d6b' : resolvedCategory?.color || '',
      categoryIcon: isSavings ? '🐷' : resolvedCategory?.icon || '',
      amount: Number.isFinite(amount) ? amount : 0,
      paymentMethod: paymentMethod || 'pix',
    }

    const dueDateValue = findValue(rawRow, HEADER_ALIASES.dueDate)
    if (dueDateValue) {
      const dueDate = parseDate(dueDateValue)
      if (dueDate) transaction.dueDate = dueDate
      else pushIssue(issues, 'warning', 'invalid_due_date', 'Vencimento inválido; será ignorado.')
    }

    const rawPaymentStatus = findValue(rawRow, HEADER_ALIASES.paymentStatus)
    if (rawPaymentStatus && transaction.type === 'expense' && !transaction.isSavings) {
      const paymentStatus = PAYMENT_STATUS_ALIASES.get(normalizeText(rawPaymentStatus))

      if (!paymentStatus) {
        pushIssue(
          issues,
          'warning',
          'invalid_payment_status',
          'Status de pagamento não reconhecido; ficará para revisão.',
        )
      } else {
        transaction.paymentStatus = paymentStatus
        if (paymentStatus === 'paid') transaction.isPaid = true
        if (paymentStatus === 'pending' || paymentStatus === 'cancelled') transaction.isPaid = false
      }
    }

    const paidAtValue = findValue(rawRow, HEADER_ALIASES.paidAt)
    if (transaction.paymentStatus === 'paid' && paidAtValue) {
      const paidAt = parsePaidAt(paidAtValue)
      if (paidAt) transaction.paidAt = paidAt
      else pushIssue(issues, 'warning', 'invalid_paid_at', 'Data de pagamento inválida; será ignorada.')
    }

    if (!issues.some((issue) => issue.severity === 'error')) {
      const signature = buildDuplicateSignature(transaction)
      const duplicateExisting = existingSignatures.has(signature)
      const duplicateInFile = previewSignatures.has(signature)

      if (duplicateExisting || duplicateInFile) {
        pushIssue(
          issues,
          'warning',
          duplicateExisting ? 'duplicate_existing' : 'duplicate_file',
          duplicateExisting
            ? 'Possível duplicidade: já existe uma transação igual no Meu Real.'
            : 'Possível duplicidade: outra linha igual aparece neste CSV.',
        )
      }

      previewSignatures.add(signature)
    }

    const hasError = issues.some((issue) => issue.severity === 'error')
    const hasWarning = issues.some((issue) => issue.severity === 'warning')
    const isDuplicate = issues.some((issue) => issue.code.startsWith('duplicate_'))

    return {
      id: `csv-row-${index + 1}`,
      rowNumber: index + 2,
      raw: rawRow,
      transaction,
      issues,
      status: hasError ? 'error' : hasWarning ? 'warning' : 'ready',
      importable: !hasError,
      duplicate: isDuplicate,
      selectedByDefault: !hasError && !isDuplicate,
    }
  })

  const summary = rows.reduce(
    (acc, row) => {
      acc.total += 1
      if (row.status === 'ready') acc.ready += 1
      if (row.status === 'warning') acc.warnings += 1
      if (row.status === 'error') acc.errors += 1
      if (row.duplicate) acc.duplicates += 1
      return acc
    },
    { total: 0, ready: 0, warnings: 0, errors: 0, duplicates: 0 },
  )

  return {
    fatalIssues: [],
    rows,
    summary,
    parserErrors: parsed.errors || [],
  }
}
