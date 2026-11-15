const OPERATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const FIELDS = [
  'type',
  'invoiceKey',
  'cardId',
  'cardName',
  'cardLast4',
  'invoiceMonth',
  'eventDate',
  'paymentDate',
  'amount',
  'sourceAccount',
  'notes',
  'direction',
  'signedAmount',
  'reversesEventId',
]

const EVENT_TYPES = new Set(['payment', 'reversal', 'adjustment', 'manual_close'])

const asCents = (value) => {
  const number = Number(value)
  const scaled = number * 100
  const rounded = Math.round(scaled)
  if (
    !Number.isFinite(number) ||
    !Number.isSafeInteger(rounded) ||
    Math.abs(scaled - rounded) > 0.0000001
  ) {
    throw new Error('Valor monetário inválido para o evento de fatura.')
  }
  return rounded
}

/**
 * Valida o saldo de um pagamento a partir de estornos legados imutáveis.
 * Não corrige nem ignora registros históricos inconsistentes.
 *
 * O documento canônico do estorno novo é excluído pelo repositório:
 * sua existência é resolvida primeiro pela transação como replay/conflito.
 */
export function validateInvoiceReversalBalance({
  payment,
  reversal,
  historicalReversals = [],
}) {
  if (
    payment?.type !== 'payment' ||
    !payment.id ||
    payment.invoiceKey !== reversal?.invoiceKey ||
    payment.cardId !== reversal?.cardId ||
    payment.id !== reversal?.reversesEventId
  ) {
    throw new Error('Pagamento de origem incompatível com a fatura. Revise o histórico.')
  }

  const paymentCents = asCents(payment.amount)
  const reversalCents = asCents(reversal.amount)
  if (paymentCents <= 0 || reversalCents <= 0) {
    throw new Error('Pagamento ou estorno com valor inválido.')
  }

  let historicalCents = 0
  for (const item of historicalReversals) {
    if (item.type !== 'reversal') {
      throw new Error('Histórico de estornos inconsistente. Revise antes de continuar.')
    }
    if (item.reversesEventId !== payment.id || item.invoiceKey !== payment.invoiceKey) {
      throw new Error('Histórico de estornos vinculado à fatura incorreta.')
    }

    const cents = asCents(item.amount)
    if (cents <= 0) {
      throw new Error('Valor de estorno histórico inválido. Revise antes de continuar.')
    }

    historicalCents += cents
    if (!Number.isSafeInteger(historicalCents) || historicalCents > paymentCents) {
      throw new Error('Histórico estornado ultrapassa o pagamento original.')
    }
  }

  const remainingCents = paymentCents - historicalCents
  if (remainingCents <= 0) {
    throw new Error('Este pagamento já foi integralmente estornado.')
  }
  if (reversalCents > remainingCents) {
    throw new Error('O estorno excede o saldo reversível após os eventos históricos.')
  }

  return remainingCents
}

/** A assinatura não inclui o ID da tentativa nem timestamps do servidor. */
export function invoiceEventSignature(event = {}) {
  return JSON.stringify(FIELDS.map((field) => [field, event[field] ?? null]))
}

export function newInvoiceOperationId(cryptoSource = globalThis.crypto) {
  if (typeof cryptoSource?.randomUUID !== 'function') {
    throw new Error('Navegador sem suporte a identificadores seguros de operações.')
  }
  return cryptoSource.randomUUID()
}

/**
 * Cada tentativa de escrita corresponde a um único documento Firestore.
 * Uma nova liquidação legítima precisa receber um novo operationId.
 */
export function prepareInvoiceEventOperation(event = {}) {
  const operationId = String(event.operationId || '')
    .trim()
    .toLowerCase()
  if (!OPERATION_ID_PATTERN.test(operationId)) {
    throw new Error('Identificador seguro de operação de fatura obrigatório.')
  }

  if (!EVENT_TYPES.has(event.type)) throw new Error('Tipo de evento de fatura inválido.')
  if (typeof event.cardId !== 'string' || !event.cardId.trim()) {
    throw new Error('Cartão obrigatório para registrar evento de fatura.')
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(event.invoiceMonth || '')) {
    throw new Error('Competência de fatura inválida.')
  }
  if (event.invoiceKey !== `${event.cardId}:${event.invoiceMonth}`) {
    throw new Error('Vínculo de fatura divergente.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.eventDate || '')) {
    throw new Error('Data do evento de fatura inválida.')
  }

  if (event.type === 'payment' || event.type === 'reversal') {
    if (asCents(event.amount) <= 0) throw new Error('O valor precisa ser positivo.')
  }
  if (event.type === 'adjustment' && asCents(event.signedAmount) === 0) {
    throw new Error('O ajuste precisa ter valor diferente de zero.')
  }
  if (
    event.type === 'reversal' &&
    (typeof event.reversesEventId !== 'string' || !event.reversesEventId)
  ) {
    throw new Error('O estorno precisa referenciar um pagamento.')
  }

  const data = { operationId }
  for (const field of FIELDS) {
    if (event[field] !== undefined) data[field] = event[field]
  }

  // Um pagamento pode ser liquidado em parcelas independentes. Já o
  // estorno integral do saldo disponível deve ser único por pagamento,
  // inclusive se duas abas gerarem UUIDs de tentativa diferentes.
  const id = event.type === 'reversal' ? `rev_${event.reversesEventId}` : `op_${operationId}`

  return {
    id,
    data,
  }
}

export function sameInvoiceOperation(persisted, expected) {
  return (
    persisted?.operationId === expected?.operationId &&
    invoiceEventSignature(persisted) === invoiceEventSignature(expected)
  )
}
