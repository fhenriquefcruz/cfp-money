// Contrato de escrita da fatura: somente dados, sem Firebase ou efeitos colaterais.
const EVENT_TYPES = ['payment', 'adjustment', 'reversal', 'manual_close']
const FIELDS = [
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
]

const validMonth = (value) => /^(?:19|20)\d{2}-(0[1-9]|1[0-2])$/.test(value || '')
const validDate = (value) => {
  if (typeof value !== 'string' || !/^(?:19|20)\d{2}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value
}
const limitedText = (value, maximum) =>
  typeof value === 'string' && value.length <= maximum
const centsExact = (value) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  Math.abs(value * 100 - Math.round(value * 100)) < 0.000001 &&
  Math.abs(value) <= 100000000

export function createInvoiceOperationId() {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('Este navegador não oferece geração segura de IDs de operação.')
  }
  return 'evt_' + globalThis.crypto.randomUUID()
}

export function validateInvoiceOperation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Evento de fatura inválido.')
  }
  const allowed = {
    payment: [...FIELDS.slice(0, 9), 'amount', 'paymentDate', 'sourceAccount'],
    adjustment: [...FIELDS.slice(0, 9), 'direction', 'signedAmount'],
    reversal: [...FIELDS.slice(0, 9), 'amount', 'reversesEventId', 'sourceAccount'],
    manual_close: FIELDS.slice(0, 9),
  }[value.type]
  if (!allowed || Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new Error('Evento de fatura contém campos incompatíveis com o tipo.')
  }
  if (
    !/^evt_[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value.operationId || '') ||
    !EVENT_TYPES.includes(value.type) ||
    !limitedText(value.cardId, 128) ||
    !value.cardId ||
    value.cardId.includes('/') ||
    !validMonth(value.invoiceMonth) ||
    value.invoiceKey !== value.cardId + ':' + value.invoiceMonth ||
    !validDate(value.eventDate) ||
    !limitedText(value.cardName, 120) ||
    !limitedText(value.cardLast4, 8) ||
    !limitedText(value.notes, 1000)
  ) {
    throw new Error('Dados de identificação ou competência da fatura inválidos.')
  }
  if (
    value.type === 'payment' &&
    (!centsExact(value.amount) || value.amount <= 0 ||
      value.paymentDate !== value.eventDate || !limitedText(value.sourceAccount, 120))
  ) {
    throw new Error('Valor ou data do pagamento inválidos.')
  }
  if (
    value.type === 'adjustment' &&
    (!centsExact(value.signedAmount) || value.signedAmount === 0 ||
      !['credit', 'charge'].includes(value.direction) ||
      (value.direction === 'credit' ? value.signedAmount >= 0 : value.signedAmount <= 0) ||
      !value.notes.trim())
  ) {
    throw new Error('Ajuste de fatura inválido.')
  }
  if (
    value.type === 'reversal' &&
    (!centsExact(value.amount) || value.amount <= 0 ||
      !limitedText(value.reversesEventId, 128) || !value.reversesEventId ||
      !limitedText(value.sourceAccount, 120))
  ) {
    throw new Error('Estorno de pagamento inválido.')
  }
  if (
    (value.type === 'manual_close' && ('amount' in value || 'signedAmount' in value)) ||
    (value.type !== 'payment' && value.type !== 'reversal' && 'amount' in value) ||
    (value.type !== 'adjustment' && 'signedAmount' in value)
  ) {
    throw new Error('Montante incompatível com o tipo de evento.')
  }
  return value
}

export function sameInvoiceOperation(saved, candidate) {
  const savedKeys = Object.keys(saved).filter((key) => key !== 'createdAt')
  const candidateKeys = Object.keys(candidate)
  return (
    savedKeys.length === candidateKeys.length &&
    candidateKeys.every(
      (key) => savedKeys.includes(key) && saved[key] === candidate[key],
    )
  )
}
