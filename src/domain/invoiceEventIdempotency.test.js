import { describe, expect, test } from 'vitest'
import { createPaymentEvent } from './invoiceLifecycle'
import {
  createInvoiceOperationId,
  invoiceEventIntentSignature,
  sameInvoiceEventIntent,
  validateInvoiceEventOperation,
} from './invoiceEventIdempotency'

const card = { id: 'card-1', name: 'Cartão de teste', last4: '1234' }
const operationId = 'integration-payment-operation-0001'

function payment(override = {}) {
  return {
    ...createPaymentEvent({
      card,
      invoiceMonth: '2026-11',
      amount: 150.25,
      paymentDate: '2026-11-15',
      sourceAccount: 'Conta 1',
    }),
    operationId,
    ...override,
  }
}

describe('idempotência de evento de fatura', () => {
  test('cria identidade segura e diferente por intenção', () => {
    const id = createInvoiceOperationId()
    expect(id).toMatch(/^[a-f0-9]{32}$/)
    expect(createInvoiceOperationId()).not.toBe(id)
  })

  test('identidade é estável por operação, não por valor e data', () => {
    const event = payment()
    const original = structuredClone(event)
    expect(validateInvoiceEventOperation(event)).toEqual({
      documentId: `op_${operationId}`,
      payload: event,
    })
    expect(event).toEqual(original)
    expect(sameInvoiceEventIntent({ ...event, createdAt: 'timestamp' }, event)).toBe(true)
    expect(sameInvoiceEventIntent({ ...event, amount: 150.26 }, event)).toBe(false)
    expect(sameInvoiceEventIntent({ ...event, operationId: 'another-operation-0001' }, event)).toBe(
      false,
    )
    expect(invoiceEventIntentSignature(event)).toBe(
      invoiceEventIntentSignature({ ...event, operationId: 'different-operation-0001' }),
    )
  })

  test('rejeita reaproveitamento malformado, valores e mês inválidos', () => {
    expect(() => validateInvoiceEventOperation(payment({ operationId: 'short' }))).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ amount: 0 }))).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ amount: -1 }))).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ amount: 1.001 }))).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ amount: '150.25' }))).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ invoiceMonth: '2026-13' }))).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ eventDate: '2026-11-31' }))).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ invoiceKey: 'other' }))).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ createdAt: 'forged' }))).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ unexpected: true }))).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ amount: 100000000.01 }))).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ cardId: 'x'.repeat(129) }))).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ notes: 'x'.repeat(2001) }))).toThrow()
    expect(() =>
      validateInvoiceEventOperation(payment({ sourceAccount: 'x'.repeat(121) })),
    ).toThrow()
    expect(() => validateInvoiceEventOperation(payment({ signedAmount: 1 }))).toThrow()
  })

  test('preserva limites exatos em centavos e contratos de fechamento manual', () => {
    expect(validateInvoiceEventOperation(payment({ amount: 0.01 })).payload.amount).toBe(0.01)
    expect(validateInvoiceEventOperation(payment({ amount: 100000000 })).payload.amount).toBe(
      100000000,
    )
    expect(() => validateInvoiceEventOperation(payment({ amount: 100000000.01 }))).toThrow()

    const base = payment()
    const manualClose = {
      operationId,
      type: 'manual_close',
      cardId: base.cardId,
      cardName: base.cardName,
      cardLast4: base.cardLast4,
      invoiceMonth: base.invoiceMonth,
      invoiceKey: base.invoiceKey,
      eventDate: base.eventDate,
      notes: '',
    }
    expect(validateInvoiceEventOperation(manualClose).documentId).toBe(`op_${operationId}`)
    expect(() => validateInvoiceEventOperation({ ...manualClose, amount: 0.01 })).toThrow()
    expect(() => validateInvoiceEventOperation({ ...manualClose, sourceAccount: '' })).toThrow()

    const adjustment = {
      ...manualClose,
      type: 'adjustment',
      direction: 'charge',
      signedAmount: 99999999.99,
      notes: 'Acréscimo autorizado',
    }
    expect(validateInvoiceEventOperation(adjustment).payload.signedAmount).toBe(99999999.99)
    expect(() =>
      validateInvoiceEventOperation({ ...adjustment, signedAmount: 100000000 }),
    ).toThrow()
    expect(() => validateInvoiceEventOperation({ ...adjustment, signedAmount: 0.001 })).toThrow()
  })

  test('permite ajustes e estornos estruturados sem tratar como despesas', () => {
    const base = {
      type: 'reversal',
      invoiceKey: 'card-1:2026-11',
      cardId: 'card-1',
      invoiceMonth: '2026-11',
      eventDate: '2026-11-15',
      notes: '',
      operationId,
    }

    expect(
      validateInvoiceEventOperation({
        ...base,
        amount: 50.25,
        reversesEventId: 'payment-document-1',
        sourceAccount: 'Conta 1',
      }).documentId,
    ).toBe(`op_${operationId}`)
    expect(() =>
      validateInvoiceEventOperation({ ...base, amount: 50.25, reversesEventId: '' }),
    ).toThrow()
    expect(() =>
      validateInvoiceEventOperation({
        ...base,
        amount: 50.25,
        reversesEventId: 'payment-document-1',
      }),
    ).toThrow()
    expect(() =>
      validateInvoiceEventOperation({
        ...base,
        amount: 50.25,
        reversesEventId: 'payment-document-1',
        sourceAccount: 'Conta 1',
        paymentDate: '2026-11-15',
      }),
    ).toThrow()

    expect(
      validateInvoiceEventOperation({
        ...base,
        type: 'adjustment',
        signedAmount: -10.25,
        direction: 'credit',
        notes: 'Desconto revisado',
      }).documentId,
    ).toBe(`op_${operationId}`)
    expect(() =>
      validateInvoiceEventOperation({
        ...base,
        type: 'adjustment',
        signedAmount: 10.25,
        direction: 'credit',
        notes: 'Desconto revisado',
      }),
    ).toThrow()
    expect(() =>
      validateInvoiceEventOperation({
        ...base,
        type: 'adjustment',
        signedAmount: 100000000,
        direction: 'charge',
        notes: 'Limite',
      }),
    ).toThrow()
    expect(() =>
      validateInvoiceEventOperation({
        ...base,
        type: 'manual_close',
        amount: 1,
      }),
    ).toThrow()
  })
})
