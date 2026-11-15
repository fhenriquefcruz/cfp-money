import {
  invoiceEventSignature,
  newInvoiceOperationId,
  prepareInvoiceEventOperation,
  sameInvoiceOperation,
} from './invoiceEventIdempotency'

const operationId = 'a4d5072f-9bd7-4ca9-9129-9d2a621ed918'
const payment = {
  type: 'payment',
  invoiceKey: 'card-1:2026-11',
  cardId: 'card-1',
  cardName: 'Cartão pessoal',
  cardLast4: '1234',
  invoiceMonth: '2026-11',
  eventDate: '2026-11-14',
  paymentDate: '2026-11-14',
  amount: 150.29,
  sourceAccount: 'Banco',
  notes: '',
  operationId,
}

test('MR-003: ID aleatório seguro pode ser injetado para testar sem IO', () => {
  expect(newInvoiceOperationId({ randomUUID: () => operationId })).toBe(operationId)
  expect(() => newInvoiceOperationId({})).toThrow('identificadores seguros')
})

test('MR-003: identifica pagamento único com referência estável, sem mutação', () => {
  const before = structuredClone(payment)
  const operation = prepareInvoiceEventOperation(payment)

  expect(operation.id).toBe(`op_${operationId}`)
  expect(operation.data).toMatchObject(payment)
  expect(operation.data).not.toHaveProperty('createdAt')
  expect(invoiceEventSignature(operation.data)).toBe(invoiceEventSignature(payment))
  expect(sameInvoiceOperation(operation.data, payment)).toBe(true)
  expect(payment).toEqual(before)
})

test('MR-003: replay não permite alterar valor, competência ou tipo', () => {
  const stored = prepareInvoiceEventOperation(payment).data

  expect(sameInvoiceOperation(stored, { ...stored, amount: 150.3 })).toBe(false)
  expect(sameInvoiceOperation(stored, { ...stored, invoiceMonth: '2026-12' })).toBe(false)
  expect(sameInvoiceOperation(stored, { ...stored, type: 'reversal' })).toBe(false)
})

test('MR-003: rejeita dados não autorizados antes da persistência', () => {
  expect(() => prepareInvoiceEventOperation({ ...payment, operationId: '' })).toThrow(
    'Identificador seguro',
  )
  expect(() => prepareInvoiceEventOperation({ ...payment, invoiceKey: 'wrong' })).toThrow(
    'Vínculo de fatura',
  )
  expect(() => prepareInvoiceEventOperation({ ...payment, amount: 0 })).toThrow('O valor precisa')
  expect(() => prepareInvoiceEventOperation({ ...payment, amount: 10.001 })).toThrow(
    'Valor monetário inválido',
  )
  expect(() => prepareInvoiceEventOperation({ ...payment, type: 'unknown' })).toThrow(
    'Tipo de evento',
  )
})

test('MR-003: estorno e ajuste preservam ligações e os sinais monetários', () => {
  const reversal = prepareInvoiceEventOperation({
    ...payment,
    type: 'reversal',
    reversesEventId: 'pay-1',
  })
  const adjustment = prepareInvoiceEventOperation({
    ...payment,
    type: 'adjustment',
    signedAmount: -20.05,
    direction: 'credit',
    amount: undefined,
  })

  expect(reversal.data.reversesEventId).toBe('pay-1')
  expect(adjustment.data.signedAmount).toBe(-20.05)
  expect(() =>
    prepareInvoiceEventOperation({
      ...payment,
      type: 'reversal',
      reversesEventId: '',
    }),
  ).toThrow('referenciar um pagamento')
})
