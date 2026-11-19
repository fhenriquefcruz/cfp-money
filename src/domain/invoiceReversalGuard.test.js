import { describe, expect, test } from 'vitest'
import { validateReversalAgainstPayment } from './invoiceReversalGuard'

const payment = {
  id: 'op_payment-1234567890123456',
  type: 'payment',
  cardId: 'card-one',
  invoiceMonth: '2026-11',
  invoiceKey: 'card-one:2026-11',
  amount: 120.02,
}

const reversal = {
  type: 'reversal',
  reversesEventId: payment.id,
  cardId: payment.cardId,
  invoiceMonth: payment.invoiceMonth,
  invoiceKey: payment.invoiceKey,
  amount: 120.02,
}

describe('MR-003: limite aritmético de estornos', () => {
  test('aprova estorno integral com centavos exatos sem modificar entradas', () => {
    const original = structuredClone(payment)
    const requested = structuredClone(reversal)
    expect(validateReversalAgainstPayment(payment, reversal)).toEqual({
      originalCents: 12002,
      requestedCents: 12002,
      historicalCents: 0,
    })
    expect(payment).toEqual(original)
    expect(reversal).toEqual(requested)
  })

  test('considera estorno legado parcial antes de permitir o saldo restante', () => {
    const history = [
      {
        type: 'reversal',
        reversesEventId: payment.id,
        amount: 20.01,
      },
    ]
    expect(
      validateReversalAgainstPayment(payment, { ...reversal, amount: 100.01 }, history),
    ).toMatchObject({ requestedCents: 10001, historicalCents: 2001 })
    expect(() => validateReversalAgainstPayment(payment, reversal, history)).toThrow(/ultrapassa/)
  })


  test('recompõe estornos legados em centavos sem arredondar valores monetários', () => {
    const history = [
      { type: 'reversal', reversesEventId: payment.id, amount: 0.01 },
      { type: 'reversal', reversesEventId: payment.id, amount: 0.02 },
      { type: 'reversal', reversesEventId: 'other-payment', amount: 999 },
      { type: 'adjustment', reversesEventId: payment.id, amount: 999 },
    ]
    expect(
      validateReversalAgainstPayment(payment, { ...reversal, amount: 119.99 }, history),
    ).toEqual({
      originalCents: 12002,
      requestedCents: 11999,
      historicalCents: 3,
    })
    expect(() =>
      validateReversalAgainstPayment(payment, { ...reversal, amount: 120 }, history),
    ).toThrow(/ultrapassa/)
  })

  test('não permite origem ou histórico com frações ocultas de centavo', () => {
    expect(() =>
      validateReversalAgainstPayment({ ...payment, amount: 120.021 }, reversal),
    ).toThrow(/centavos exatos/)
    expect(() =>
      validateReversalAgainstPayment(payment, reversal, [
        { type: 'reversal', reversesEventId: payment.id, amount: 0.001 },
      ]),
    ).toThrow(/centavos exatos/)
  })

  test('rejeita outro cartão, outra competência e origem inexistente', () => {
    expect(() => validateReversalAgainstPayment(null, reversal)).toThrow(/origem/)
    expect(() =>
      validateReversalAgainstPayment(payment, { ...reversal, invoiceMonth: '2026-12' }),
    ).toThrow(/não corresponde/)
    expect(() =>
      validateReversalAgainstPayment(payment, { ...reversal, cardId: 'other-card' }),
    ).toThrow(/não corresponde/)
  })

  test('falha fechado para valor textual, negativo, fração de centavo ou histórico inválido', () => {
    for (const amount of ['120.02', -1, 0, 1.001, Number.NaN, Infinity]) {
      expect(() => validateReversalAgainstPayment(payment, { ...reversal, amount })).toThrow()
    }
    expect(() =>
      validateReversalAgainstPayment(payment, reversal, [
        { type: 'reversal', reversesEventId: payment.id, amount: '0.01' },
      ]),
    ).toThrow(/inválido/)
  })
})
