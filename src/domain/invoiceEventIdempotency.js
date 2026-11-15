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

export const asCents = (value) => {
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
