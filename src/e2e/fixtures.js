const pad = (value) => String(value).padStart(2, '0')

function localIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dateInCurrentMonth(day) {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return localIsoDate(new Date(now.getFullYear(), now.getMonth(), Math.min(day, lastDay)))
}

function futureDate(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return localIsoDate(date)
}

const createdAt = () => new Date().toISOString()

export const e2eUser = {
  uid: 'e2e-user',
  displayName: 'Fábio E2E',
  email: 'fabio.e2e@meureal.test',
  emailVerified: true,
  getIdTokenResult: async () => ({ claims: {} }),
}

export const e2ePlanData = {
  plan: 'premium',
  premiumUntil: futureDate(365),
  blocked: false,
}

export const e2eMoneySettings = {
  cycleType: 'calendar_month',
  cycleStartDay: 1,
  comparisonMode: 'elapsed_days',
  excludeSavings: true,
}

export function createE2EAppState() {
  const categories = [
    {
      id: 'cat-food',
      name: 'Alimentação',
      type: 'expense',
      icon: '🍽️',
      color: '#f97316',
    },
    {
      id: 'cat-home',
      name: 'Moradia',
      type: 'expense',
      icon: '🏠',
      color: '#8b5cf6',
    },
    {
      id: 'cat-transport',
      name: 'Transporte',
      type: 'expense',
      icon: '🚗',
      color: '#0ea5e9',
    },
    {
      id: 'cat-health',
      name: 'Saúde',
      type: 'expense',
      icon: '🩺',
      color: '#ef4444',
    },
    {
      id: 'cat-salary',
      name: 'Salário',
      type: 'income',
      icon: '💼',
      color: '#10b981',
    },
  ]

  const transactions = [
    {
      id: 'tx-salary',
      type: 'income',
      amount: 11400,
      description: 'Salário mensal',
      categoryId: 'cat-salary',
      categoryName: 'Salário',
      categoryIcon: '💼',
      categoryColor: '#10b981',
      paymentMethod: 'pix',
      date: dateInCurrentMonth(5),
      createdAt: createdAt(),
    },
    {
      id: 'tx-rent',
      type: 'expense',
      amount: 2500,
      description: 'Aluguel',
      categoryId: 'cat-home',
      categoryName: 'Moradia',
      categoryIcon: '🏠',
      categoryColor: '#8b5cf6',
      paymentMethod: 'pix',
      date: dateInCurrentMonth(7),
      createdAt: createdAt(),
    },
    {
      id: 'tx-market',
      type: 'expense',
      amount: 684.73,
      description: 'Compras do mercado',
      categoryId: 'cat-food',
      categoryName: 'Alimentação',
      categoryIcon: '🍽️',
      categoryColor: '#f97316',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      date: dateInCurrentMonth(12),
      purchaseDate: dateInCurrentMonth(12),
      createdAt: createdAt(),
    },
    {
      id: 'tx-fuel',
      type: 'expense',
      amount: 219.9,
      description: 'Combustível',
      categoryId: 'cat-transport',
      categoryName: 'Transporte',
      categoryIcon: '🚗',
      categoryColor: '#0ea5e9',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      date: dateInCurrentMonth(18),
      purchaseDate: dateInCurrentMonth(18),
      createdAt: createdAt(),
    },
    {
      id: 'tx-health',
      type: 'expense',
      amount: 180,
      description: 'Consulta odontológica com descrição extensa para testar quebra de linha',
      categoryId: 'cat-health',
      categoryName: 'Saúde',
      categoryIcon: '🩺',
      categoryColor: '#ef4444',
      paymentMethod: 'pix',
      date: dateInCurrentMonth(22),
      notes: 'Observação longa de homologação móvel sem provocar rolagem horizontal.',
      createdAt: createdAt(),
    },
    {
      id: 'tx-savings',
      type: 'income',
      isSavings: true,
      amount: 1500,
      description: 'Reserva de emergência',
      categoryId: '_savings',
      categoryName: 'Poupança',
      categoryIcon: '🐷',
      categoryColor: '#6366f1',
      paymentMethod: 'pix',
      date: dateInCurrentMonth(25),
      createdAt: createdAt(),
    },
  ]

  return {
    transactions,
    categories,
    goals: [
      {
        id: 'goal-car',
        name: 'Entrada do carro',
        emoji: '🚗',
        targetAmount: 60000,
        currentAmount: 18500,
        deadline: futureDate(240),
      },
    ],
    budgets: [
      { id: 'budget-food', categoryId: 'cat-food', amount: 1500 },
      { id: 'budget-transport', categoryId: 'cat-transport', amount: 700 },
    ],
    creditCards: [
      {
        id: 'card-nubank',
        name: 'Nubank',
        last4: '4582',
        brand: 'mastercard',
        limit: 8000,
        closingDay: 5,
        dueDay: 12,
        active: true,
        color: '#7c3aed',
      },
    ],
    invoiceEvents: [],
    loading: {
      transactions: false,
      categories: false,
      goals: false,
      budgets: false,
      creditCards: false,
      invoiceEvents: false,
    },
    notifications: [],
  }
}
