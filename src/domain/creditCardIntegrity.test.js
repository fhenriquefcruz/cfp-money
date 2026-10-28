import { expect, test } from 'vitest'
import { auditCreditCardIntegrity } from './creditCardIntegrity'
import { summarizeCardLinks } from './cardLinkageSummary'

const card = { id: 'card-real', name: 'Cartão' }
const purchase = {
  id: 'tx1',
  type: 'expense',
  paymentMethod: 'credit_card',
  cardId: 'card-real',
  amount: 120.15,
  invoiceMonth: '2026-10',
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
    totalPurchases: 3,
    purchaseTotal: 171.3,
    linkedCount: 1,
    linkedTotal: 120.15,
    unlinkedCount: 1,
    unlinkedTotal: 31.05,
    orphanedCardCount: 1,
    orphanedCardTotal: 20.1,
  })
  expect(JSON.stringify(input)).toBe(original)
})

test('sinaliza mês inválido sem modificar registros e não trata compras pagas como duplicadas', () => {
  const result = auditCreditCardIntegrity({
    transactions: [
      { ...purchase, invoiceMonth: '2026-13', isPaid: true, cardReconciliation: { version: 1 } },
      { id: 'pix', type: 'expense', paymentMethod: 'pix', amount: 8 },
      {
        id: 'cancel',
        type: 'expense',
        paymentMethod: 'credit_card',
        paymentStatus: 'cancelled',
        amount: 9,
      },
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

test('particiona todas as compras sem duplicar totais ou ignorar crédito sinalizado', () => {
  const transactions = Object.freeze([
    Object.freeze({ ...purchase, id: 'active', amount: 120.15 }),
    Object.freeze({ ...purchase, id: 'historical', cardId: 'deleted-card', amount: 20.1 }),
    Object.freeze({
      id: 'unlinked-legacy',
      type: 'expense',
      paymentMethod: 'credit_card',
      amount: 0.1,
    }),
    Object.freeze({
      id: 'unlinked-flagged',
      type: 'expense',
      paymentMethod: 'pix',
      isCreditPurchase: true,
      amount: 0.2,
    }),
    Object.freeze({
      id: 'non-credit',
      type: 'expense',
      paymentMethod: 'pix',
      amount: 999,
    }),
  ])
  const result = auditCreditCardIntegrity({
    transactions,
    creditCards: Object.freeze([Object.freeze(card)]),
  })

  expect(result).toMatchObject({
    totalPurchases: 4,
    purchaseTotal: 140.55,
    linkedCount: 1,
    unlinkedCount: 2,
    historicalCount: 1,
    savedLinkCount: 2,
    historicalTotal: 20.1,
    orphanedCardCount: 1,
    reconcilableCount: 1,
  })
  expect(result.totalPurchases).toBe(
    result.linkedCount + result.unlinkedCount + result.historicalCount,
  )
  expect(Math.round(result.purchaseTotal * 100)).toBe(
    Math.round((result.linkedTotal + result.unlinkedTotal + result.historicalTotal) * 100),
  )
  expect(result.exceptions.unlinked).toEqual(['unlinked-legacy', 'unlinked-flagged'])
  expect(result.exceptions.missingCard).toEqual(['historical'])
  expect(transactions[3].cardId).toBeUndefined()
})

test('não conta lançamento cancelado, receita ou poupança mesmo com cardId', () => {
  const result = auditCreditCardIntegrity({
    creditCards: [card],
    transactions: [
      { ...purchase, id: 'cancelled', paymentStatus: 'cancelled' },
      { ...purchase, id: 'income', type: 'income' },
      { ...purchase, id: 'savings', isSavings: true },
      { ...purchase, id: 'cardId-only', paymentMethod: 'other', amount: 1.01 },
    ],
  })

  expect(result.totalPurchases).toBe(1)
  expect(result.linkedCount).toBe(1)
  expect(result.linkedTotal).toBe(1.01)
  expect(result.unlinkedCount).toBe(0)
})

test('retorna contadores zerados, sem NaN, quando não há dados', () => {
  expect(auditCreditCardIntegrity()).toMatchObject({
    totalPurchases: 0,
    purchaseTotal: 0,
    linkedCount: 0,
    unlinkedCount: 0,
    historicalCount: 0,
    savedLinkCount: 0,
    reconcilableCount: 0,
  })
  const result = auditCreditCardIntegrity({
    transactions: [{ ...purchase, amount: 'invalid' }],
    creditCards: [card],
  })
  expect(result.purchaseTotal).toBe(0)
  expect(result.linkedTotal).toBe(0)
})

test('o resumo leve coincide com a auditoria detalhada para todos os grupos', () => {
  const transactions = [
    { ...purchase, id: 'linked', amount: 12.35 },
    { ...purchase, id: 'historical', cardId: 'deleted', amount: 7.11 },
    { id: 'unlinked', type: 'expense', isCreditPurchase: true, amount: 3.05 },
    { id: 'cancelled', ...purchase, paymentStatus: 'cancelled' },
    { id: 'income', type: 'income', cardId: 'card-real' },
  ]
  const input = { transactions, creditCards: [card] }
  const detailed = auditCreditCardIntegrity(input)
  const summary = summarizeCardLinks(input)
  expect(summary).toMatchObject({
    saved: detailed.savedLinkCount,
    unlinked: detailed.unlinkedCount,
    historical: detailed.historicalCount,
    unlinkedPurchases: [],
    unlinkedTotal: 0,
  })
  expect(Math.round(detailed.purchaseTotal * 100)).toBe(
    Math.round((detailed.linkedTotal + detailed.unlinkedTotal + detailed.historicalTotal) * 100),
  )
})

test('resumo preserva compras realmente conciliáveis e soma valores em centavos', () => {
  const transactions = [
    { id: 'a', type: 'expense', paymentMethod: 'credit_card', amount: 0.1 },
    { id: 'b', type: 'expense', paymentMethod: 'credit_card', amount: 0.2 },
    { id: 'only-flag', type: 'expense', isCreditPurchase: true, amount: 100 },
    { id: 'cancelled', type: 'expense', paymentMethod: 'credit_card', paymentStatus: 'cancelled', amount: 200 },
  ]
  const original = JSON.stringify(transactions)
  const result = summarizeCardLinks({ transactions })
  expect(result.unlinked).toBe(3)
  expect(result.unlinkedPurchases.map((item) => item.id)).toEqual(['a', 'b'])
  expect(result.unlinkedTotal).toBe(0.3)
  expect(JSON.stringify(transactions)).toBe(original)
})
