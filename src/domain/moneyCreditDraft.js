import {
  buildMoneyTransactionDraft,
  normalizeMoneyCommand,
} from './moneyTransactionDraft'
import {
  calculateInvoiceSchedule,
  splitInstallmentAmounts,
} from './creditCards'

function parseInstallments(normalizedMessage) {
  const patterns = [
    /\bem\s+(\d{1,2})\s*x\b/,
    /\b(\d{1,2})\s*x\b/,
    /\bem\s+(\d{1,2})\s+vez(?:es)?\b/,
    /\b(\d{1,2})\s+vez(?:es)?\b/,
    /\b(\d{1,2})\s+parcelas?\b/,
  ]

  for (const pattern of patterns) {
    const match = normalizedMessage.match(pattern)
    if (match) {
      const value = Number(match[1])
      if (value >= 1 && value <= 48) return value
    }
  }

  if (normalizedMessage.includes('parcel')) return ''
  return 1
}

function hasCreditIntent(normalizedMessage, cards) {
  const mentionsRegisteredCard = cards.some((card) => {
    const normalizedName = normalizeMoneyCommand(card.name)
    return normalizedName && normalizedMessage.includes(normalizedName)
  })

  return (
    mentionsRegisteredCard ||
    normalizedMessage.includes('cartao') ||
    normalizedMessage.includes('credito') ||
    normalizedMessage.includes('parcel') ||
    /\b\d{1,2}\s*x\b/.test(normalizedMessage) ||
    /\b\d{1,2}\s+vez(?:es)?\b/.test(normalizedMessage)
  )
}

function findCard(normalizedMessage, cards) {
  return [...cards]
    .sort(
      (a, b) =>
        normalizeMoneyCommand(b.name).length -
        normalizeMoneyCommand(a.name).length,
    )
    .find((card) => {
      const normalizedName = normalizeMoneyCommand(card.name)
      const matchesName =
        normalizedName && normalizedMessage.includes(normalizedName)
      const matchesLast4 =
        card.last4 && normalizedMessage.includes(String(card.last4))
      return matchesName || matchesLast4
    })
}

function findDuplicateCreditDraft(draft, transactions) {
  if (!draft.amount || !draft.categoryId || !draft.cardId) return null

  return (
    transactions.find((transaction) => {
      const existingPurchaseDate =
        transaction.originalPurchaseDate || transaction.purchaseDate

      const existingTotal =
        transaction.originalAmount ||
        (!transaction.isInstallment ? transaction.amount : null)

      return (
        transaction.isCreditPurchase &&
        transaction.cardId === draft.cardId &&
        existingPurchaseDate === draft.purchaseDate &&
        Number(existingTotal) === Number(draft.amount) &&
        transaction.categoryId === draft.categoryId
      )
    }) || null
  )
}

export function buildMoneyCreditDraft({
  message,
  categories = [],
  creditCards = [],
  transactions = [],
  now = new Date(),
}) {
  const normalizedMessage = normalizeMoneyCommand(message)
  const activeCards = creditCards.filter((card) => card.active !== false)

  if (!normalizedMessage || !hasCreditIntent(normalizedMessage, activeCards)) {
    return null
  }

  if (activeCards.length === 0) {
    return {
      type: 'credit_card_setup_required',
      title: 'Cadastre um cartão antes de continuar',
      text:
        'O Money precisa do fechamento e do vencimento para calcular a fatura com segurança. Nenhuma compra foi criada.',
      profileRoute: '/profile',
    }
  }

  const messageWithExpenseContext =
    /\b(gastei|paguei|comprei|despesa|custou)\b/.test(normalizedMessage)
      ? message
      : `Comprei ${message}`

  const baseResponse = buildMoneyTransactionDraft({
    message: messageWithExpenseContext,
    categories,
    transactions,
    now,
    allowAdvanced: true,
  })

  if (!baseResponse || baseResponse.type !== 'transaction_draft') {
    return null
  }

  const matchedCard = findCard(normalizedMessage, activeCards)
  const selectedCard =
    matchedCard || (activeCards.length === 1 ? activeCards[0] : null)

  const installments = parseInstallments(normalizedMessage)
  const purchaseDate = baseResponse.draft.date
  const schedule =
    selectedCard && purchaseDate
      ? calculateInvoiceSchedule(purchaseDate, selectedCard)
      : null

  const installmentAmounts =
    selectedCard &&
    baseResponse.draft.amount &&
    Number(installments) >= 1
      ? splitInstallmentAmounts(
          Number(baseResponse.draft.amount),
          Number(installments),
        )
      : []

  const draft = {
    ...baseResponse.draft,
    type: 'expense',
    paymentMethod: 'credit_card',
    date: '',
    purchaseDate,
    cardId: selectedCard?.id || '',
    cardName: selectedCard?.name || '',
    cardLast4: selectedCard?.last4 || '',
    installments,
    isInstallment: Number(installments) > 1,
    source: 'money_assistant',
  }

  const missingFields = []
  if (!draft.amount) missingFields.push('amount')
  if (!draft.categoryId) missingFields.push('categoryId')
  if (!draft.purchaseDate) missingFields.push('purchaseDate')
  if (!draft.cardId) missingFields.push('cardId')
  if (!Number(draft.installments)) missingFields.push('installments')

  const warnings = [...(baseResponse.warnings || [])]
  if (!matchedCard && activeCards.length > 1) {
    warnings.push(
      'Não identifiquei qual cartão você quis usar. Selecione o cartão antes de confirmar.',
    )
  }

  if (findDuplicateCreditDraft(draft, transactions)) {
    warnings.push(
      'Já existe uma compra com o mesmo cartão, valor, data e categoria. Revise para evitar duplicidade.',
    )
  }

  return {
    type: 'credit_transaction_draft',
    title:
      Number(installments) > 1
        ? 'Revise a compra parcelada'
        : 'Revise a compra no cartão',
    text:
      'O Money calculou a fatura a partir do cartão cadastrado. Confira a compra, o cartão e as parcelas antes de salvar.',
    draft,
    schedule,
    installmentAmounts,
    missingFields,
    warnings,
  }
}
