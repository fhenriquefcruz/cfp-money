// Uma chave representa uma intenção explícita de registrar um evento na fatura.
const OPERATION_ID = /^[A-Za-z0-9_-]{16,80}$/
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const DAY = /^\d{4}-\d{2}-\d{2}$/
const TYPES = new Set(['payment', 'reversal', 'adjustment', 'manual_close'])
const FIELDS = new Set([
  'operationId',
  'type',
  'invoiceKey',
  'cardId',
  'cardName',
  'cardLast4',
  'invoiceMonth',
  'eventDate',
  'notes',
  'amount',
  'paymentDate',
  'sourceAccount',
  'direction',
  'signedAmount',
  'reversesEventId',
])

function validDay(value) {
  if (typeof value !== 'string' || !DAY.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function validCents(value, signed = false) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  const cents = Math.round(value * 100)
  return (
    Number.isSafeInteger(cents) &&
    (signed ? cents !== 0 : cents > 0) &&
    Math.abs(value - cents / 100) < 1e-9
  )
}

export function createInvoiceOperationId(random = globalThis.crypto) {
  if (typeof random?.randomUUID === 'function') return random.randomUUID()
  if (typeof random?.getRandomValues !== 'function') {
    throw new Error('Não foi possível criar uma identidade segura para a operação.')
  }
  const bytes = random.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function invoiceEventIntentSignature(event = {}) {
  return JSON.stringify(
    Object.entries(event)
      .filter(([key]) => key !== 'operationId' && key !== 'createdAt' && key !== 'id')
      .sort(([a], [b]) => a.localeCompare(b)),
  )
}

export function validateInvoiceEventOperation(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error('Evento financeiro inválido.')
  }
  const { operationId, cardId, invoiceMonth, invoiceKey, type, eventDate } = event
  if (typeof operationId !== 'string' || !OPERATION_ID.test(operationId)) {
    throw new Error('Identidade de operação inválida.')
  }
  if (
    Object.keys(event).some((key) => !FIELDS.has(key)) ||
    typeof cardId !== 'string' ||
    !cardId.trim() ||
    cardId.includes('/') ||
    typeof invoiceMonth !== 'string' ||
    !MONTH.test(invoiceMonth) ||
    invoiceKey !== `${cardId}:${invoiceMonth}` ||
    !TYPES.has(type) ||
    !validDay(eventDate)
  ) {
    throw new Error('Dados da fatura inválidos para registro.')
  }

  if (type === 'payment') {
    if (
      !validCents(event.amount) ||
      event.paymentDate !== eventDate ||
      typeof event.sourceAccount !== 'string'
    ) {
      throw new Error('Valor, conta ou data do pagamento inválidos.')
    }
  } else if (type === 'reversal') {
    if (
      !validCents(event.amount) ||
      typeof event.reversesEventId !== 'string' ||
      !event.reversesEventId.trim()
    ) {
      throw new Error('Estorno sem pagamento válido de origem.')
    }
  } else if (type === 'adjustment') {
    if (
      !validCents(event.signedAmount, true) ||
      !['charge', 'credit'].includes(event.direction) ||
      (event.direction === 'credit') !== (event.signedAmount < 0) ||
      !String(event.notes || '').trim()
    ) {
      throw new Error('Ajuste sem valor ou justificativa válida.')
    }
  }

  if (
    (event.notes !== undefined && typeof event.notes !== 'string') ||
    (event.cardName !== undefined && typeof event.cardName !== 'string') ||
    (event.sourceAccount !== undefined && typeof event.sourceAccount !== 'string') ||
    (typeof event.notes === 'string' && event.notes.length > 2000)
  ) {
    throw new Error('Campos descritivos inválidos.')
  }

  return { documentId: `op_${operationId}`, payload: { ...event } }
}

export function sameInvoiceEventIntent(existing, expected) {
  if (!existing || existing.operationId !== expected.operationId) return false
  return invoiceEventIntentSignature(existing) === invoiceEventIntentSignature(expected)
}
