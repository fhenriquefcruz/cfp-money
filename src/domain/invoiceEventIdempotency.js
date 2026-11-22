// Uma chave representa uma intenção explícita de registrar um evento na fatura.
const OPERATION_ID = /^[A-Za-z0-9_-]{16,80}$/
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const DAY = /^\d{4}-\d{2}-\d{2}$/
const TYPES = new Set(['payment', 'reversal', 'adjustment', 'manual_close'])
const ALLOWED_FIELDS = new Set([
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

function invalidOperation() {
  throw new Error('Evento de fatura inválido. Confira os dados.')
}

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
    (signed ? cents !== 0 && Math.abs(value) < 100000000 : cents > 0 && value <= 100000000) &&
    Math.abs(value - cents / 100) < 1e-9
  )
}

export function createInvoiceOperationId(random = globalThis.crypto) {
  if (typeof random?.getRandomValues !== 'function') {
    throw new Error('Não foi possível criar uma identidade segura para a operação.')
  }
  return Array.from(random.getRandomValues(new Uint8Array(16)), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')
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
    invalidOperation()
  }
  const { operationId, cardId, invoiceMonth, invoiceKey, type, eventDate } = event
  if (typeof operationId !== 'string' || !OPERATION_ID.test(operationId)) {
    invalidOperation()
  }
  if (
    'createdAt' in event ||
    'id' in event ||
    Object.keys(event).some((key) => !ALLOWED_FIELDS.has(key)) ||
    typeof event.notes !== 'string' ||
    event.notes.length > 2000 ||
    (event.cardName !== undefined && typeof event.cardName !== 'string') ||
    (event.cardLast4 !== undefined && typeof event.cardLast4 !== 'string') ||
    typeof cardId !== 'string' ||
    !cardId.trim() ||
    cardId.length > 128 ||
    cardId.includes('/') ||
    typeof invoiceMonth !== 'string' ||
    !MONTH.test(invoiceMonth) ||
    invoiceKey !== `${cardId}:${invoiceMonth}` ||
    !TYPES.has(type) ||
    !validDay(eventDate)
  ) {
    invalidOperation()
  }

  if (type === 'payment') {
    if (
      !validCents(event.amount) ||
      event.paymentDate !== eventDate ||
      typeof event.sourceAccount !== 'string' ||
      event.sourceAccount.length > 120 ||
      'direction' in event ||
      'signedAmount' in event ||
      'reversesEventId' in event
    ) {
      invalidOperation()
    }
  } else if (type === 'reversal') {
    if (
      !validCents(event.amount) ||
      typeof event.reversesEventId !== 'string' ||
      !event.reversesEventId.trim() ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(event.reversesEventId) ||
      typeof event.sourceAccount !== 'string' ||
      event.sourceAccount.length > 120 ||
      'paymentDate' in event ||
      'signedAmount' in event ||
      'direction' in event
    ) {
      invalidOperation()
    }
  } else if (type === 'adjustment') {
    if (
      !validCents(event.signedAmount, true) ||
      !['charge', 'credit'].includes(event.direction) ||
      (event.direction === 'credit') !== event.signedAmount < 0 ||
      !String(event.notes || '').trim() ||
      'amount' in event ||
      'paymentDate' in event ||
      'sourceAccount' in event ||
      'reversesEventId' in event
    ) {
      invalidOperation()
    }
  } else if (
    'amount' in event ||
    'paymentDate' in event ||
    'sourceAccount' in event ||
    'signedAmount' in event ||
    'direction' in event ||
    'reversesEventId' in event
  ) {
    invalidOperation()
  }

  return { documentId: `op_${operationId}`, payload: { ...event } }
}

export function sameInvoiceEventIntent(existing, expected) {
  if (!existing || existing.operationId !== expected.operationId) return false
  return invoiceEventIntentSignature(existing) === invoiceEventIntentSignature(expected)
}
