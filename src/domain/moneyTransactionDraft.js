const PAYMENT_PATTERNS = [
  { id: 'pix', patterns: [/\bpix\b/] },
  { id: 'debit_card', patterns: [/\bdebito\b/, /\bcartao de debito\b/] },
  { id: 'cash', patterns: [/\bdinheiro\b/, /\bespecie\b/] },
  { id: 'transfer', patterns: [/\btransferencia\b/, /\bted\b/, /\bdoc\b/] },
  { id: 'boleto', patterns: [/\bboleto\b/] },
]

const EXPENSE_WORDS = [
  'gastei',
  'paguei',
  'comprei',
  'despesa',
  'custou',
  'saiu',
  'debitei',
]

const INCOME_WORDS = [
  'recebi',
  'ganhei',
  'entrou',
  'receita',
  'salario',
  'pagamento recebido',
]

const CATEGORY_KEYWORDS = {
  alimentacao: [
    'mercado',
    'supermercado',
    'restaurante',
    'almoco',
    'jantar',
    'lanche',
    'comida',
    'padaria',
  ],
  transporte: [
    'uber',
    '99',
    'taxi',
    'gasolina',
    'combustivel',
    'onibus',
    'estacionamento',
  ],
  moradia: [
    'aluguel',
    'condominio',
    'energia',
    'luz',
    'agua',
    'internet',
    'casa',
  ],
  saude: [
    'dentista',
    'medico',
    'consulta',
    'farmacia',
    'remedio',
    'academia',
    'exame',
  ],
  educacao: [
    'curso',
    'livro',
    'faculdade',
    'escola',
    'mensalidade',
    'material escolar',
  ],
  lazer: [
    'cinema',
    'viagem',
    'passeio',
    'jogo',
    'festa',
    'show',
  ],
  roupas: [
    'roupa',
    'camisa',
    'calca',
    'sapato',
    'tenis',
  ],
  salario: [
    'salario',
    'pagamento',
    'remuneracao',
    'holerite',
  ],
}

export function normalizeMoneyCommand(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N},./\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function parsePtBrNumber(rawValue) {
  if (!rawValue) return null

  let normalized = String(rawValue).replace(/\s/g, '')

  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.')
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '')
  }

  const value = Number(normalized)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function parseMoneyAmount(message) {
  const normalized = normalizeMoneyCommand(message)

  const currencyMatch = normalized.match(
    /(?:r\s*\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|real))?/,
  )

  return parsePtBrNumber(currencyMatch?.[1])
}

function detectType(normalizedMessage) {
  const hasIncomeWord = INCOME_WORDS.some((word) => normalizedMessage.includes(word))
  const hasExpenseWord = EXPENSE_WORDS.some((word) => normalizedMessage.includes(word))

  if (hasIncomeWord && !hasExpenseWord) return 'income'
  if (hasExpenseWord) return 'expense'
  return null
}

function detectPaymentMethod(normalizedMessage) {
  return (
    PAYMENT_PATTERNS.find(({ patterns }) =>
      patterns.some((pattern) => pattern.test(normalizedMessage)),
    )?.id || ''
  )
}

function parseTransactionDate(normalizedMessage, now) {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (normalizedMessage.includes('anteontem')) {
    base.setDate(base.getDate() - 2)
    return toIsoDate(base)
  }

  if (normalizedMessage.includes('ontem')) {
    base.setDate(base.getDate() - 1)
    return toIsoDate(base)
  }

  if (normalizedMessage.includes('hoje')) return toIsoDate(base)

  const fullDate = normalizedMessage.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/)
  if (fullDate) {
    const day = Number(fullDate[1])
    const month = Number(fullDate[2]) - 1
    let year = fullDate[3] ? Number(fullDate[3]) : now.getFullYear()
    if (year < 100) year += 2000

    const candidate = new Date(year, month, day)
    if (
      candidate.getFullYear() === year &&
      candidate.getMonth() === month &&
      candidate.getDate() === day
    ) {
      return toIsoDate(candidate)
    }
  }

  return toIsoDate(base)
}

function findCategoryFromText(normalizedMessage, categories, type) {
  const eligible = categories.filter(
    (category) => category.type === type || category.type === 'both',
  )

  const directMatch = eligible
    .sort(
      (a, b) =>
        normalizeMoneyCommand(b.name).length - normalizeMoneyCommand(a.name).length,
    )
    .find((category) => normalizedMessage.includes(normalizeMoneyCommand(category.name)))

  if (directMatch) return { category: directMatch, matchedKeyword: directMatch.name }

  for (const category of eligible) {
    const normalizedName = normalizeMoneyCommand(category.name)
    const keywords = CATEGORY_KEYWORDS[normalizedName] || []
    const keyword = keywords.find((item) => normalizedMessage.includes(item))
    if (keyword) return { category, matchedKeyword: keyword }
  }

  return { category: null, matchedKeyword: '' }
}

function deriveDescription(normalizedMessage, matchedKeyword, categoryName) {
  if (matchedKeyword) {
    return matchedKeyword.charAt(0).toUpperCase() + matchedKeyword.slice(1)
  }

  let description = normalizedMessage
    .replace(/\bmoney\b/g, '')
    .replace(
      /\b(gastei|paguei|comprei|despesa|custou|saiu|debitei|recebi|ganhei|entrou|receita)\b/g,
      '',
    )
    .replace(/(?:r\s*\$\s*)?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?/g, '')
    .replace(/\b(reais|real|por|via|no pix|pix|dinheiro|debito|transferencia|boleto)\b/g, '')
    .replace(/\b(hoje|ontem|anteontem)\b/g, '')
    .replace(/\b(no|na|em|de|do|da)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!description) description = categoryName || ''
  return description.slice(0, 90)
}

function hasAdvancedCardFlow(normalizedMessage) {
  return (
    normalizedMessage.includes('cartao de credito') ||
    normalizedMessage.includes('credito') ||
    normalizedMessage.includes('parcel') ||
    /\b\d+\s*x\b/.test(normalizedMessage) ||
    /\b\d+\s+vezes\b/.test(normalizedMessage)
  )
}

function isQuestionInsteadOfCreation(normalizedMessage) {
  return (
    normalizedMessage.includes('quanto gastei') ||
    normalizedMessage.includes('quanto recebi') ||
    normalizedMessage.includes('relatorio') ||
    normalizedMessage.includes('como estao')
  )
}

function detectDuplicate(draft, transactions) {
  if (!draft.amount || !draft.categoryId) return null

  return (
    transactions.find(
      (transaction) =>
        transaction.type === draft.type &&
        Number(transaction.amount) === Number(draft.amount) &&
        transaction.date === draft.date &&
        transaction.categoryId === draft.categoryId,
    ) || null
  )
}

export function buildMoneyTransactionDraft({
  message,
  categories = [],
  transactions = [],
  now = new Date(),
}) {
  const normalizedMessage = normalizeMoneyCommand(message)

  if (!normalizedMessage || isQuestionInsteadOfCreation(normalizedMessage)) return null

  const type = detectType(normalizedMessage)
  if (!type) return null

  if (hasAdvancedCardFlow(normalizedMessage)) {
    return {
      type: 'transaction_advanced_required',
      title: 'Esta compra precisa do fluxo de cartão',
      text:
        'Para evitar lançar a compra na fatura errada, cartão de crédito e parcelamentos ainda devem ser cadastrados pela tela de Transações. O Money não simplificará esse pedido automaticamente.',
      transactionRoute: '/transactions',
    }
  }

  const amount = parseMoneyAmount(normalizedMessage)
  const paymentMethod = detectPaymentMethod(normalizedMessage)
  const date = parseTransactionDate(normalizedMessage, now)
  const { category, matchedKeyword } = findCategoryFromText(
    normalizedMessage,
    categories,
    type,
  )
  const description = deriveDescription(
    normalizedMessage,
    matchedKeyword,
    category?.name,
  )

  const draft = {
    type,
    isSavings: false,
    amount: amount || '',
    description,
    categoryId: category?.id || '',
    categoryName: category?.name || '',
    categoryColor: category?.color || '',
    categoryIcon: category?.icon || '',
    paymentMethod,
    date,
    notes: '',
    isRecurring: false,
    source: 'money_assistant',
  }

  const missingFields = []
  if (!draft.amount) missingFields.push('amount')
  if (!draft.categoryId) missingFields.push('categoryId')
  if (!draft.paymentMethod) missingFields.push('paymentMethod')
  if (!draft.date) missingFields.push('date')

  const duplicate = detectDuplicate(draft, transactions)
  const warnings = duplicate
    ? [
        'Já existe um lançamento com o mesmo tipo, valor, data e categoria. Revise antes de confirmar.',
      ]
    : []

  return {
    type: 'transaction_draft',
    title: type === 'income' ? 'Revise a receita' : 'Revise a despesa',
    text:
      'O Money preparou um rascunho. Confira todos os campos; o lançamento só será salvo depois da confirmação.',
    draft,
    missingFields,
    warnings,
  }
}
