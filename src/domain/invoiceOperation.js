// Contrato de escrita da fatura: somente dados, sem Firebase ou efeitos colaterais.
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
]

const validMonth = (value) => /^(?:19|20)\d{2}-(0[1-9]|1[0-2])$/.test(value || '')
const validDate = (value) => {
  if (typeof value !== 'string' || !/^(?:19|20)\d{2}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value
}
const limitedText = (value, maximum) => typeof value === 'string' && value.length <= maximum
const centsExact = (value) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  Math.abs(value * 100 - Math.round(value * 100)) < 0.000001 &&
  Math.abs(value) <= 100000000

export function createInvoiceOperationId() {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('Operação segura indisponível.')
  }
  return 'evt_' + globalThis.crypto.randomUUID()
}

// Apenas pagamentos escritos pelo contrato novo são elegíveis a estorno
// automático. Eventos legados precisam de conciliação histórica supervisionada.
export function reversalOperationId(paymentId) {
  if (!/^evt_[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(paymentId || '')) {
    throw new Error('Pagamento histórico: estorno exige revisão.')
  }
  return 'rev_' + paymentId
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
    throw new Error('Campos incompatíveis com o evento.')
  }
  if (
    !/^(?:evt|rev_evt)_[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
      value.operationId || '',
    ) ||
    (value.type === 'reversal'
      ? value.operationId !== reversalOperationId(value.reversesEventId)
      : value.operationId.startsWith('rev_')) ||
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
    throw new Error('Fatura ou competência inválida.')
  }
  if (
    value.type === 'payment' &&
    (!centsExact(value.amount) ||
      value.amount <= 0 ||
      value.paymentDate !== value.eventDate ||
      !limitedText(value.sourceAccount, 120))
  ) {
    throw new Error('Pagamento inválido.')
  }
  if (
    value.type === 'adjustment' &&
    (!centsExact(value.signedAmount) ||
      value.signedAmount === 0 ||
      !['credit', 'charge'].includes(value.direction) ||
      (value.direction === 'credit' ? value.signedAmount >= 0 : value.signedAmount <= 0) ||
      !value.notes.trim())
  ) {
    throw new Error('Ajuste inválido.')
  }
  if (
    value.type === 'reversal' &&
    (!centsExact(value.amount) ||
      value.amount <= 0 ||
      !limitedText(value.reversesEventId, 128) ||
      !value.reversesEventId ||
      !limitedText(value.sourceAccount, 120))
  ) {
    throw new Error('Estorno inválido.')
  }
  return value
}

export function sameInvoiceOperation(saved, candidate) {
  const keys = Object.keys(saved).filter((key) => key !== 'createdAt')
  return (
    keys.length === Object.keys(candidate).length &&
    keys.every((key) => saved[key] === candidate[key])
  )
}
