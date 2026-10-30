import { describe, expect, it } from 'vitest'
import { auditLoadedCardInvoices } from './cardInvoiceReadOnlyAudit'

function invoice(overrides = {}) {
  return {
    items: [{ amount: 100 }],
    events: [],
    purchaseTotal: 100,
    total: 100,
    lifecycle: {
      purchaseTotal: 100,
      adjustmentTotal: 0,
      invoiceTotal: 100,
      baselinePaidAmount: 0,
      paidAmount: 0,
      remainingAmount: 100,
      creditAmount: 0,
    },
    ...overrides,
  }
}

describe('auditLoadedCardInvoices', () => {
  it('confere fatura sem pagamentos e ignora cartoes sem movimentacao', () => {
    expect(auditLoadedCardInvoices([invoice(), invoice({ items: [], events: [] })])).toEqual({
      total: 1,
      checked: 1,
      divergent: 0,
      inconclusive: 0,
    })
  })

  it('confere centavos, ajustes, pagamentos e estornos sem duplicar valores', () => {
    const record = invoice({
      items: [{ amount: 100.05 }],
      events: [
        { type: 'payment', amount: 40.05 },
        { type: 'reversal', amount: 10 },
        { type: 'adjustment', signedAmount: -5.05 },
      ],
      purchaseTotal: 100.05,
      total: 95,
      lifecycle: {
        purchaseTotal: 100.05,
        adjustmentTotal: -5.05,
        invoiceTotal: 95,
        baselinePaidAmount: 0,
        paidAmount: 30.05,
        remainingAmount: 64.95,
        creditAmount: 0,
      },
    })
    expect(auditLoadedCardInvoices([record])).toEqual({
      total: 1,
      checked: 1,
      divergent: 0,
      inconclusive: 0,
    })
  })

  it('sinaliza divergencias sem alterar dados de entrada', () => {
    const original = invoice({ total: 99 })
    const before = JSON.stringify(original)
    expect(auditLoadedCardInvoices([original])).toEqual({
      total: 1,
      checked: 0,
      divergent: 1,
      inconclusive: 0,
    })
    expect(JSON.stringify(original)).toBe(before)
  })

  it('nao considera valor ilegivel, vazio ou nao finito como zero valido', () => {
    const invalidAmount = invoice({ items: [{ amount: 'nao numerico' }] })
    const missingPayment = invoice({ events: [{ type: 'payment' }] })
    const notFinite = invoice({ items: [{ amount: Infinity }] })
    const emptyValue = invoice({ items: [{ amount: '' }] })
    expect(auditLoadedCardInvoices([invalidAmount, missingPayment, notFinite, emptyValue])).toEqual(
      { total: 4, checked: 0, divergent: 0, inconclusive: 4 },
    )
  })

  it('classifica tipos de eventos desconhecidos como inconclusivos', () => {
    const original = invoice({ events: [{ type: 'unknown', amount: 10 }] })
    expect(auditLoadedCardInvoices([original])).toEqual({
      total: 1,
      checked: 0,
      divergent: 0,
      inconclusive: 1,
    })
  })

  it('diferencia credito da fatura do saldo restante', () => {
    const record = invoice({
      events: [{ type: 'payment', amount: 130 }],
      lifecycle: {
        purchaseTotal: 100,
        adjustmentTotal: 0,
        invoiceTotal: 100,
        baselinePaidAmount: 0,
        paidAmount: 130,
        remainingAmount: 0,
        creditAmount: 30,
      },
    })
    expect(auditLoadedCardInvoices([record]).checked).toBe(1)
  })
})
