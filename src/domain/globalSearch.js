const DEFAULT_LIMIT = 8

const MODULES = [
  { id: 'dashboard', label: 'Dashboard', detail: 'Visão geral financeira', to: '/dashboard' },
  { id: 'money', label: 'Money', detail: 'Assistente e prioridades financeiras', to: '/money' },
  { id: 'cards', label: 'Cartões', detail: 'Faturas, limites e parcelas', to: '/cards' },
  { id: 'transactions', label: 'Transações', detail: 'Receitas, despesas e pagamentos', to: '/transactions' },
  { id: 'categories', label: 'Categorias', detail: 'Organização dos lançamentos', to: '/categories' },
  { id: 'goals', label: 'Metas', detail: 'Objetivos financeiros', to: '/goals' },
  { id: 'budgets', label: 'Orçamentos', detail: 'Limites mensais por categoria', to: '/budgets' },
  { id: 'reports', label: 'Relatórios', detail: 'Análises e consolidações', to: '/reports' },
  { id: 'profile', label: 'Perfil', detail: 'Conta e preferências', to: '/profile' },
]

export function normalizeGlobalSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0)

const encodeSearch = (value) => encodeURIComponent(String(value || '').trim())

function scoreResult(result, normalizedQuery) {
  if (!normalizedQuery) return result.kind === 'module' ? 20 : 0

  const label = normalizeGlobalSearchText(result.label)
  const detail = normalizeGlobalSearchText(result.detail)
  const keywords = normalizeGlobalSearchText(result.keywords)
  const haystack = `${label} ${detail} ${keywords}`.trim()

  if (!haystack.includes(normalizedQuery)) return 0

  let score = 40

  if (label === normalizedQuery) score += 80
  else if (label.startsWith(normalizedQuery)) score += 55
  else if (label.includes(normalizedQuery)) score += 35

  const queryTokens = normalizedQuery.split(' ').filter(Boolean)
  const matchingTokens = queryTokens.filter((token) => haystack.includes(token)).length
  score += matchingTokens * 8

  if (result.kind === 'module') score += 8
  if (result.kind === 'transaction') score += 5

  return score
}

export function buildGlobalSearchIndex({
  transactions = [],
  categories = [],
  goals = [],
  creditCards = [],
  isAdmin = false,
} = {}) {
  const moduleResults = [
    ...MODULES,
    ...(isAdmin
      ? [{ id: 'admin', label: 'Admin', detail: 'Usuários e administração', to: '/admin' }]
      : []),
  ].map((item) => ({
    ...item,
    id: `module-${item.id}`,
    kind: 'module',
    group: 'Navegação',
    keywords: item.detail,
  }))

  const transactionResults = (Array.isArray(transactions) ? transactions : []).map((transaction) => {
    const description =
      String(transaction.description || '').trim() ||
      String(transaction.categoryName || '').trim() ||
      'Transação'
    const categoryName = String(transaction.categoryName || '').trim()
    const typeLabel = transaction.isSavings
      ? 'Poupança'
      : transaction.type === 'income'
        ? 'Receita'
        : 'Despesa'

    return {
      id: `transaction-${transaction.id}`,
      kind: 'transaction',
      group: 'Transações',
      label: description,
      detail: [typeLabel, categoryName, formatCurrency(transaction.amount)].filter(Boolean).join(' · '),
      keywords: [
        transaction.notes,
        transaction.paymentMethod,
        transaction.date,
        categoryName,
        transaction.amount,
      ]
        .filter(Boolean)
        .join(' '),
      to: `/transactions?search=${encodeSearch(description)}`,
    }
  })

  const categoryResults = (Array.isArray(categories) ? categories : []).map((category) => ({
    id: `category-${category.id}`,
    kind: 'category',
    group: 'Categorias',
    label: category.name || 'Categoria',
    detail: category.type === 'income' ? 'Categoria de receita' : 'Categoria de despesa',
    keywords: [category.icon, category.type].filter(Boolean).join(' '),
    to: '/categories',
  }))

  const goalResults = (Array.isArray(goals) ? goals : []).map((goal) => ({
    id: `goal-${goal.id}`,
    kind: 'goal',
    group: 'Metas',
    label: goal.name || 'Meta',
    detail: `Meta de ${formatCurrency(goal.targetAmount)}`,
    keywords: [goal.emoji, goal.deadline, goal.currentAmount].filter(Boolean).join(' '),
    to: '/goals',
  }))

  const cardResults = (Array.isArray(creditCards) ? creditCards : []).map((card) => ({
    id: `card-${card.id}`,
    kind: 'card',
    group: 'Cartões',
    label: card.name || 'Cartão',
    detail: card.last4 ? `Final ${card.last4}` : 'Cartão de crédito',
    keywords: [card.brand, card.last4, card.limit].filter(Boolean).join(' '),
    to: '/cards',
  }))

  return [
    ...moduleResults,
    ...transactionResults,
    ...categoryResults,
    ...goalResults,
    ...cardResults,
  ]
}

export function searchGlobalIndex(index = [], query = '', limit = DEFAULT_LIMIT) {
  const normalizedQuery = normalizeGlobalSearchText(query)
  const safeLimit = Math.max(1, Number(limit) || DEFAULT_LIMIT)

  return (Array.isArray(index) ? index : [])
    .map((result, position) => ({
      result,
      position,
      score: scoreResult(result, normalizedQuery),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.position - b.position)
    .slice(0, safeLimit)
    .map(({ result }) => result)
}

export { DEFAULT_LIMIT as GLOBAL_SEARCH_RESULT_LIMIT }
