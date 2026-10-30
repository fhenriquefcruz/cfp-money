import { webcrypto } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  createInvoiceOperationId,
  reversalOperationId,
  sameInvoiceOperation,
  validateInvoiceOperation,
} from './invoiceOperation'

const payment = (changes = {}) => ({
  operationId: 'evt_123e4567-e89b-42d3-a456-426614174000',
  type: 'payment',
  invoiceKey: 'card-demo:2026-10',
  cardId: 'card-demo',
  cardName: 'Cartão sintético',
  cardLast4: '5186',
  invoiceMonth: '2026-10',
  eventDate: '2026-10-30',
  notes: '',
  amount: 300,
  paymentDate: '2026-10-30',
  sourceAccount: 'Conta sintética',
  ...changes,
})

describe('Gate 2 — operação de fatura', () => {
  it('gera operação de identidade segura, sem dados financeiros no identificador', () => {
    vi.stubGlobal('crypto', webcrypto)
    try {
      const id = createInvoiceOperationId()
      expect(id).toMatch(/^evt_[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/)
      expect(createInvoiceOperationId()).not.toBe(id)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('valida pagamento parcial e rejeita negativos, strings e mais de dois decimais', () => {
    expect(validateInvoiceOperation(payment()).amount).toBe(300)
    expect(() => validateInvoiceOperation(payment({ amount: '300.00' }))).toThrow()
    expect(() => validateInvoiceOperation(payment({ amount: -300 }))).toThrow()
    expect(() => validateInvoiceOperation(payment({ amount: 1.005 }))).toThrow()
    expect(() => validateInvoiceOperation(payment({ paymentDate: '2026-10-29' }))).toThrow()
  })

  it('rejeita dados de cartão, mês ou operação incompatíveis', () => {
    expect(() => validateInvoiceOperation(payment({ invoiceMonth: '2026-13' }))).toThrow()
    expect(() => validateInvoiceOperation(payment({ invoiceKey: 'other:2026-10' }))).toThrow()
    expect(() => validateInvoiceOperation(payment({ operationId: 'danger' }))).toThrow()
    expect(() => validateInvoiceOperation(payment({ eventDate: '2026-02-31' }))).toThrow()
    expect(() => validateInvoiceOperation(payment({ unexpected: true }))).toThrow()
  })

  it('mantém ajuste, fechamento e estorno no schema correto', () => {
    const closing = payment()
    delete closing.amount
    delete closing.paymentDate
    delete closing.sourceAccount
    expect(
      validateInvoiceOperation({
        ...closing,
        type: 'adjustment',
        direction: 'credit',
        signedAmount: -35,
        notes: 'Crédito comprovado',
      }),
    ).toBeTruthy()
    expect(validateInvoiceOperation({ ...closing, type: 'manual_close' })).toBeTruthy()
    expect(
      validateInvoiceOperation({
        ...closing,
        type: 'reversal',
        operationId: reversalOperationId(payment().operationId),
        amount: 300,
        reversesEventId: payment().operationId,
        sourceAccount: 'Conta sintética',
      }),
    ).toBeTruthy()
  })

  it('exige chave única do estorno integral do mesmo pagamento', () => {
    const reversal = {
      ...payment(),
      type: 'reversal',
      operationId: reversalOperationId(payment().operationId),
      reversesEventId: payment().operationId,
    }
    delete reversal.paymentDate
    expect(validateInvoiceOperation(reversal)).toBeTruthy()
    expect(() =>
      validateInvoiceOperation({
        ...reversal,
        operationId: 'evt_123e4567-e89b-42d3-a456-426614174099',
      }),
    ).toThrow()
    expect(() => reversalOperationId('old-payment')).toThrow(/revisão/)
  })

  it('confirma retry idêntico e rejeita reutilização de chave com payload diferente', () => {
    const saved = { ...payment(), createdAt: { seconds: 100 } }
    expect(sameInvoiceOperation(saved, payment())).toBe(true)
    expect(sameInvoiceOperation(saved, payment({ amount: 301 }))).toBe(false)
    expect(sameInvoiceOperation(saved, payment({ notes: 'outra operação' }))).toBe(false)
  })
})
