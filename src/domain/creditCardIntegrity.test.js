import { expect, test } from 'vitest'
import { auditCreditCardIntegrity } from './creditCardIntegrity'

const card = { id: 'card-real', name: 'Cartão' }
const purchase = {
  id: 'tx1', type: 'expense', paymentMethod: 'credit_card',
  cardId: 'card-real', amount: 120.15, invoiceMonth: '2026-10',
}

test('calcula totais em centavos e não duplica compras conciliadas', () => {
  const tx = [
    purchase,
    { id: 'tx2', type: 'expense', paymentMethod: 'credit_card', amount: 31.05, date: '2026-10-01' },
    { id: 'tx3', type: 'expense', paymentMethod: 'credit_card', amount: 20.1, cardId: 'deleted' },
    { id: 'salary', type: 'income', amount: 999 },
  ]
  const input = { transactions: tx, creditCards: [card] }
  const original = JSON.stringify(input)
  const result = auditCreditCardIntegrity(input)
  expect(result).toMatchObject({
    totalPurchases: 3, purchaseTotal: 171.3, linkedCount: 1,
    linkedTotal: 120.15, unlinkedCount: 1, unlinkedTotal: 31.05,
    orphanedCardCount: 1, orphanedCardTotal: 20.1,
  })
  expect(JSON.stringify(input)).toBe(original)
})

test('sinaliza mês inválido sem modificar registros e não trata compras pagas como duplicadas', () => {
  const result = auditCreditCardIntegrity({
    transactions: [
      { ...purchase, invoiceMonth: '2026-13', isPaid: true, cardReconciliation: { version: 1 } },
      { id: 'pix', type: 'expense', paymentMethod: 'pix', amount: 8 },
      { id: 'cancel', type: 'expense', paymentMethod: 'credit_card', paymentStatus: 'cancelled', amount: 9 },
    ],
    creditCards: [card],
  })
  expect(result.totalPurchases).toBe(1)
  expect(result.invalidMonthCount).toBe(1)
  expect(result.exceptions.invalidMonth).toEqual(['tx1'])
  expect(result.reversibleCount).toBe(1)
})

test('não confunde cartão removido com compra sem vínculo e não cria ID fictício', () => {
  const result = auditCreditCardIntegrity({
    transactions: [{ ...purchase, cardId: 'removed' }],
    creditCards: [],
  })
  expect(result.unlinkedCount).toBe(0)
  expect(result.orphanedCardCount).toBe(1)
  expect(result.exceptions.missingCard).toEqual(['tx1'])
})
