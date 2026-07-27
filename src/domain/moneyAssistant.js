const MONTHS = [
  { index: 0, name: 'janeiro', aliases: ['janeiro', 'jan'] },
  { index: 1, name: 'fevereiro', aliases: ['fevereiro', 'fev'] },
  { index: 2, name: 'março', aliases: ['marco', 'mar'] },
  { index: 3, name: 'abril', aliases: ['abril', 'abr'] },
  { index: 4, name: 'maio', aliases: ['maio', 'mai'] },
  { index: 5, name: 'junho', aliases: ['junho', 'jun'] },
  { index: 6, name: 'julho', aliases: ['julho', 'jul'] },
  { index: 7, name: 'agosto', aliases: ['agosto', 'ago'] },
  { index: 8, name: 'setembro', aliases: ['setembro', 'set'] },
  { index: 9, name: 'outubro', aliases: ['outubro', 'out'] },
  { index: 10, name: 'novembro', aliases: ['novembro', 'nov'] },
  { index: 11, name: 'dezembro', aliases: ['dezembro', 'dez'] },
]

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
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

function getMonthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function capitalize(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : value
}

function resolveMonthFromMessage(normalizedMessage, now) {
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  if (
    normalizedMessage.includes('mes atual') ||
    normalizedMessage.includes('este mes') ||
    normalizedMessage.includes('desse mes') ||
    normalizedMessage.includes('deste mes')
  ) {
    return { year: currentYear, month: currentMonth, source: 'current' }
  }

  if (
    normalizedMessage.includes('mes passado') ||
    normalizedMessage.includes('ultimo mes') ||
    normalizedMessage.includes('mes anterior')
  ) {
    const date = new Date(currentYear, currentMonth - 1, 1)
    return { year: date.getFullYear(), month: date.getMonth(), source: 'previous' }
  }

  const explicitMonth = MONTHS.find((candidate) =>
    candidate.aliases.some((alias) =>
      new RegExp(`(^|\\s)${alias}(?=\\s|$)`).test(normalizedMessage),
    ),
  )

  if (!explicitMonth) return null

  const explicitYear = normalizedMessage.match(/\b(20\d{2})\b/)
  let year = explicitYear ? Number(explicitYear[1]) : currentYear

  if (!explicitYear && normalizedMessage.includes('ano passado')) {
    year = currentYear - 1
  } else if (!explicitYear && explicitMonth.index > currentMonth) {
    year = currentYear - 1
  }

  return { year, month: explicitMonth.index, source: 'explicit' }
}

function getCalendarMonthPeriod(year, month) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)

  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
    monthKey: getMonthKey(year, month),
    label: `${MONTHS[month].name} de ${year}`,
  }
}

function getCurrentCycleLabel(periods) {
  if (!periods?.current) return 'período atual'
  const formatDate = (value) => {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }
  return `${formatDate(periods.current.start)} a ${formatDate(periods.current.end)}`
}

function summarize(transactions) {
  return transactions.reduce(
    (summary, transaction) => {
      const amount = Number(transaction.amount) || 0
      if (transaction.type === 'income') summary.income += amount
      if (transaction.type === 'expense') summary.expenses += amount
      summary.balance = summary.income - summary.expenses
      summary.count += 1
      return summary
    },
    { income: 0, expenses: 0, balance: 0, count: 0 },
  )
}

function findCategory(normalizedMessage, categories = [], transactions = []) {
  const candidates = new Map()

  for (const category of categories) {
    if (!category?.name) continue
    candidates.set(category.id || normalizeText(category.name), {
      id: category.id || null,
      name: category.name,
    })
  }

  for (const transaction of transactions) {
    if (!transaction?.categoryName) continue
    const key = transaction.categoryId || normalizeText(transaction.categoryName)
    if (!candidates.has(key)) {
      candidates.set(key, {
        id: transaction.categoryId || null,
        name: transaction.categoryName,
      })
    }
  }

  return [...candidates.values()]
    .sort((a, b) => normalizeText(b.name).length - normalizeText(a.name).length)
    .find((category) => {
      const normalizedName = normalizeText(category.name)
      return normalizedName && normalizedMessage.includes(normalizedName)
    })
}

function filterMonthTransactions(transactions, period, excludeSavings = true) {
  return transactions.filter((transaction) => {
    if (!transaction?.date) return false
    if (transaction.date < period.start || transaction.date > period.end) return false
    if (excludeSavings && transaction.isSavings) return false
    return true
  })
}

function formatVariation(value) {
  if (value === null || value === undefined) return null
  if (value === 0) return 'no mesmo nível'
  return `${Math.abs(value).toFixed(1).replace('.', ',')}% ${value > 0 ? 'acima' : 'abaixo'}`
}

export function parseMoneyAssistantIntent(
  message,
  categories = [],
  transactions = [],
  now = new Date(),
) {
  const normalizedMessage = normalizeText(message)
  const category = findCategory(normalizedMessage, categories, transactions)
  const requestedMonth = resolveMonthFromMessage(normalizedMessage, now)

  if (!normalizedMessage) return { type: 'empty' }

  if (
    normalizedMessage.includes('ajuda') ||
    normalizedMessage.includes('o que voce faz') ||
    normalizedMessage.includes('comandos')
  ) {
    return { type: 'help' }
  }

  const asksCategoryAmount =
    normalizedMessage.includes('quanto gastei') ||
    normalizedMessage.includes('gasto com') ||
    normalizedMessage.includes('gastos com')

  if (category && asksCategoryAmount) {
    return {
      type: 'category_report',
      category,
      requestedMonth:
        requestedMonth || { year: now.getFullYear(), month: now.getMonth(), source: 'default' },
    }
  }

  const asksMonthlyReport =
    normalizedMessage.includes('relatorio') ||
    normalizedMessage.includes('fechamento') ||
    normalizedMessage.includes('resumo de') ||
    normalizedMessage.includes('resumo do')

  if (asksMonthlyReport) {
    return {
      type: 'monthly_report',
      requestedMonth:
        requestedMonth || { year: now.getFullYear(), month: now.getMonth(), source: 'default' },
    }
  }

  const asksFinancialStatus =
    normalizedMessage.includes('como estao minhas financas') ||
    normalizedMessage.includes('como estao meus gastos') ||
    normalizedMessage.includes('situacao financeira') ||
    normalizedMessage.includes('analise financeira') ||
    normalizedMessage.includes('analise do money')

  if (asksFinancialStatus) return { type: 'cycle_summary' }

  return { type: 'unknown' }
}

export function buildMoneyAssistantResponse({
  message,
  transactions = [],
  categories = [],
  settings = {},
  now = new Date(),
  analyze,
}) {
  const intent = parseMoneyAssistantIntent(message, categories, transactions, now)

  if (intent.type === 'empty') {
    return { type: 'error', title: 'Mensagem vazia', text: 'Escreva uma pergunta para o Money.' }
  }

  if (intent.type === 'help' || intent.type === 'unknown') {
    return {
      type: 'help',
      title: intent.type === 'unknown' ? 'Ainda não entendi esse pedido' : 'Como posso ajudar',
      text:
        'Nesta fase, posso consultar seus dados sem alterar nenhum lançamento. Peça um relatório mensal, uma análise do período atual ou o total gasto em uma categoria.',
      suggestions: [
        'Como estão minhas finanças?',
        'Quero o relatório do mês atual',
        'Quero o relatório de abril',
        'Quanto gastei com alimentação este mês?',
      ],
    }
  }

  if (intent.type === 'cycle_summary') {
    const analysis = analyze(transactions, settings, now)
    const variation = formatVariation(analysis.comparison.expenseChangePercent)

    if (analysis.current.transactionCount === 0 && analysis.previous.transactionCount === 0) {
      return {
        type: 'cycle_summary',
        title: 'Ainda não há histórico suficiente',
        text: 'Registre receitas e despesas para o Money começar a comparar seu ciclo financeiro.',
      }
    }

    return {
      type: 'cycle_summary',
      title: 'Análise do período atual',
      text: variation
        ? `Suas despesas estão ${variation} do período equivalente anterior.`
        : 'Ainda não existe um período anterior com despesas para calcular a variação percentual.',
      secondaryText:
        analysis.insights.find((item) => item.type === 'category_increase')?.message || null,
      metrics: [
        { label: 'Receitas', value: analysis.current.income },
        { label: 'Despesas', value: analysis.current.expenses },
        { label: 'Saldo', value: analysis.current.balance },
        { label: 'Projeção', value: analysis.projection.expenses },
      ],
      periodLabel: getCurrentCycleLabel(analysis.periods),
    }
  }

  const period = getCalendarMonthPeriod(intent.requestedMonth.year, intent.requestedMonth.month)
  let periodTransactions = filterMonthTransactions(
    transactions,
    period,
    settings.excludeSavings !== false,
  )

  if (intent.type === 'category_report') {
    periodTransactions = periodTransactions.filter((transaction) => {
      if (transaction.type !== 'expense') return false
      if (intent.category.id && transaction.categoryId === intent.category.id) return true
      return normalizeText(transaction.categoryName) === normalizeText(intent.category.name)
    })

    const total = periodTransactions.reduce(
      (sum, transaction) => sum + (Number(transaction.amount) || 0),
      0,
    )

    return {
      type: 'category_report',
      title: `${intent.category.name} em ${period.label}`,
      text:
        periodTransactions.length > 0
          ? `Você gastou ${currencyFormatter.format(total)} em ${intent.category.name}, distribuídos em ${periodTransactions.length} lançamento${periodTransactions.length === 1 ? '' : 's'}.`
          : `Não encontrei despesas de ${intent.category.name} em ${period.label}.`,
      metrics:
        periodTransactions.length > 0
          ? [
              { label: 'Total', value: total },
              { label: 'Lançamentos', rawValue: String(periodTransactions.length) },
            ]
          : [],
      reportMonth: period.monthKey,
      periodLabel: capitalize(period.label),
    }
  }

  const summary = summarize(periodTransactions)

  return {
    type: 'monthly_report',
    title: `Relatório de ${period.label}`,
    text:
      summary.count > 0
        ? `Encontrei ${summary.count} lançamento${summary.count === 1 ? '' : 's'} no período. O resultado foi ${summary.balance >= 0 ? 'positivo' : 'negativo'} em ${currencyFormatter.format(Math.abs(summary.balance))}.`
        : `Não encontrei lançamentos em ${period.label}.`,
    metrics:
      summary.count > 0
        ? [
            { label: 'Receitas', value: summary.income },
            { label: 'Despesas', value: summary.expenses },
            { label: 'Resultado', value: summary.balance },
          ]
        : [],
    reportMonth: period.monthKey,
    periodLabel: capitalize(period.label),
  }
}
