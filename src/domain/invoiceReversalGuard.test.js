import { validateInvoiceReversalBalance } from './invoiceReversalGuard'

const payment = {
  id: 'pay-123',
  type: 'payment',
  invoiceKey: 'card:2026-11',
  amount: '100.25',
}
const reversal = {
  type: 'reversal',
  invoiceKey: 'card:2026-11',
  reversesEventId: 'pay-123',
  amount: '60.20',
}

test('MR-003: permite um único estorno dentro do pagamento original', () => {
  expect(validateInvoiceReversalBalance(payment, reversal)).toEqual({
    originalCents: 10025,
    requestedCents: 6020,
    previouslyReversedCents: 0,
  })
})

test('MR-003: agrega os estornos legados antes de aceitar o novo valor', () => {
  const history = [
    { type: 'reversal', reversesEventId: 'pay-123', amount: 30.05 },
    { type: 'reversal', reversesEventId: 'another-payment', amount: 1000 },
    { type: 'adjustment', reversesEventId: 'pay-123', amount: 20 },
  ]
  expect(validateInvoiceReversalBalance(payment, reversal, history)).toEqual({
    originalCents: 10025,
    requestedCents: 6020,
    previouslyReversedCents: 3005,
  })
  expect(() =>
    validateInvoiceReversalBalance(payment, { ...reversal, amount: 70.21 }, history),
  ).toThrow('ultrapassaria o pagamento original')
})

test('MR-003: recusa fatura diferente, pagamento ausente e frações de centavo', () => {
  expect(() => validateInvoiceReversalBalance(null, reversal)).toThrow('origem')
  expect(() =>
    validateInvoiceReversalBalance(payment, { ...reversal, invoiceKey: 'other:2026-11' }),
  ).toThrow('mesmo pagamento')
  expect(() =>
    validateInvoiceReversalBalance(payment, { ...reversal, amount: 0.001 }),
  ).toThrow('Valor monetário inválido')
  expect(() =>
    validateInvoiceReversalBalance(payment, reversal, [
      { type: 'reversal', reversesEventId: 'pay-123', amount: '0.001' },
    ]),
  ).toThrow('Valor monetário inválido')
})

test('MR-003: não altera as referências históricas de entrada', () => {
  const history = Object.freeze([
    Object.freeze({ type: 'reversal', reversesEventId: 'pay-123', amount: '20.01' }),
  ])
  const before = structuredClone(payment)
  const result = validateInvoiceReversalBalance(payment, reversal, history)
  expect(result.previouslyReversedCents).toBe(2001)
  expect(payment).toEqual(before)
  expect(history[0].amount).toBe('20.01')
})
