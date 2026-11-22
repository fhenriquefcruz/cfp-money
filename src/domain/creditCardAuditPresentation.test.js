import { describe, expect, test } from 'vitest'
import { describeCardAuditFindings } from './creditCardAuditPresentation'

describe('apresentação da auditoria de cartões', () => {
  test('prioriza inconsistências críticas e identifica fatura sem expor IDs como rótulos', () => {
    const findings = [
      { code: 'historical_card_references', severity: 'info', count: 1 },
      {
        code: 'unmatched_payment_reversal',
        severity: 'review',
        cardId: 'card-1',
        invoiceMonth: '2026-11',
      },
      {
        code: 'cross_invoice_payment_reversal',
        severity: 'critical',
        cardId: 'card-1',
        invoiceMonth: '2026-11',
        paymentId: 'secret-payment',
      },
    ]
    const original = structuredClone(findings)
    const items = describeCardAuditFindings(findings, [{ id: 'card-1', name: 'Cartão principal' }])

    expect(items.map((item) => item.code)).toEqual([
      'cross_invoice_payment_reversal',
      'unmatched_payment_reversal',
      'historical_card_references',
    ])
    expect(items[0]).toMatchObject({
      title: 'Estorno vinculado a outra fatura',
      scope: 'Cartão principal · Fatura 2026-11',
    })
    expect(items[0].scope).not.toContain('secret-payment')
    expect(findings).toEqual(original)
  })

  test('preserva cartões históricos, códigos desconhecidos e resultado vazio sem inventar vínculos', () => {
    const items = describeCardAuditFindings([
      {
        code: 'over_reversed_payment',
        severity: 'critical',
        cardId: 'deleted-card',
        invoiceMonth: '2026-10',
      },
      { code: 'new_rule', severity: 'review' },
    ])

    expect(items[0].scope).toBe('Cartão sem cadastro atual · Fatura 2026-10')
    expect(items[1].title).toBe('Registro financeiro a conferir')
    expect(describeCardAuditFindings()).toEqual([])
  })

  test('mostra revisão e histórico em nível distinto de risco crítico', () => {
    const items = describeCardAuditFindings([
      { code: 'unlinked_credit_purchases', severity: 'review' },
      { code: 'historical_card_references', severity: 'info' },
    ])
    expect(items.map((item) => item.rank)).toEqual([1, 2])
    expect(items[1].guidance).toContain('não significa, por si só, erro')
  })
})
