const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const FAMILY_RULES = [
  {
    id: 'ride_hailing',
    label: 'Transporte por aplicativo',
    terms: ['transporte por aplicativo', 'uber', '99app', '99 pop', 'indriver', 'cabify'],
  },
  {
    id: 'fuel',
    label: 'Combustível',
    terms: ['posto ', 'gasolina', 'etanol', 'diesel', 'combustivel'],
  },
  {
    id: 'vehicle_financing',
    label: 'Consórcio / financiamento',
    terms: ['consorcio', 'financiamento veiculo', 'financiamento carro'],
  },
  {
    id: 'loan',
    label: 'Empréstimos',
    terms: ['emprestimo', 'credito pessoal', 'consignado'],
  },
  {
    id: 'transfer',
    label: 'Transferência',
    terms: ['transferencia', 'ted enviada', 'doc enviado', 'pix transferencia'],
  },
]

function detectFamily(text) {
  const normalized = normalize(text)
  return (
    FAMILY_RULES.find((rule) => rule.terms.some((term) => normalized.includes(normalize(term)))) ||
    null
  )
}

function categoryFamily(category = {}) {
  return detectFamily(category.name)
}

export function reviewTransactionCategory(transaction = {}, categories = []) {
  if (transaction.type !== 'expense' || transaction.isSavings) return null
  if (transaction.paymentStatus === 'cancelled') return null

  const inferred = detectFamily(
    [transaction.description, transaction.notes, transaction.merchantName].filter(Boolean).join(' '),
  )
  if (!inferred) return null

  const currentCategory = categories.find((category) => category.id === transaction.categoryId)
  const currentFamily = categoryFamily(currentCategory || { name: transaction.categoryName })

  if (currentFamily?.id === inferred.id) return null

  const suggestedCategory =
    categories.find((category) => category.type === 'expense' && categoryFamily(category)?.id === inferred.id) ||
    null

  return {
    transactionId: transaction.id,
    description: transaction.description || 'Sem descrição',
    currentCategoryId: currentCategory?.id || transaction.categoryId || null,
    currentCategoryName: currentCategory?.name || transaction.categoryName || 'Sem categoria',
    suggestedFamily: inferred.id,
    suggestedCategoryId: suggestedCategory?.id || null,
    suggestedCategoryName: suggestedCategory?.name || inferred.label,
    reason: `A descrição indica “${inferred.label}”, diferente da categoria atual.`,
    requiresConfirmation: true,
  }
}

export function buildCategoryReviewQueue(transactions = [], categories = []) {
  return transactions
    .map((transaction) => reviewTransactionCategory(transaction, categories))
    .filter(Boolean)
}
