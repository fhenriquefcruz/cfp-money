import { expect, test } from 'vitest'
import { auditCardLinkage } from './cardLinkageAudit'

const creditCards = [{ id: 'card-active', name: 'Ativo' }]
const expense = {
  type: 'expense',
  paymentMethod: 'credit_card',
  date: '2026-10-12',
}

test('separa vínculos salvos, compras sem vínculo e cartões apenas históricos', () => {
  const transactions = [
    { ...expense, id: 'linked', amount: 219.9, cardId: 'card-active' },
    { ...expense, id: 'historical', amount: 52.11, cardId: 'card-removed' },
    { ...expense, id: 'unlinked-a', amount: 0.1 },
    { ...expense, id: 'unlinked-b', amount: 0.2 },
  ]

  const result = auditCardLinkage({ transactions, creditCards })
  expect(result).toMatchObject({
    savedLinkCount: 2,
    registeredLinkCount: 1,
    historicalLinkCount: 1,
    unlinkedCount: 2,
    unlinkedAmount: 0.3,
    paymentMethodReviewCount: 0,
  })
  expect(transactions[2].cardId).toBeUndefined()
  expect(creditCards).toHaveLength(1)
})

test('não trata cartão removido como compra sem vínculo nem força reassociação', () => {
  const historical = {
    ...expense,
    id: 'archived',
    amount: 99,
    cardId: 'archived-card',
    cardName: 'Cartão antigo',
  }
  const result = auditCardLinkage({ transactions: [historical], creditCards: [] })
  expect(result.savedLinkCount).toBe(1)
  expect(result.historicalLinkCount).toBe(1)
  expect(result.unlinkedCount).toBe(0)
  expect(historical.cardId).toBe('archived-card')
})

test('sinaliza separadamente compras de crédito sem método elegível para conciliação', () => {
  const result = auditCardLinkage({
    creditCards,
    transactions: [
      { ...expense, amount: 25, paymentMethod: 'pix', isCreditPurchase: true },
      { ...expense, amount: 35 },
      { ...expense, amount: 40, paymentStatus: 'cancelled' },
      { ...expense, amount: 50, isSavings: true },
      { ...expense, amount: 60, type: 'income' },
    ],
  })

  expect(result.unlinkedCount).toBe(2)
  expect(result.unlinkedAmount).toBe(60)
  expect(result.paymentMethodReviewCount).toBe(1)
})

test('retorna métricas zeradas sem dados e não modifica os parâmetros', () => {
  const transactions = Object.freeze([
    Object.freeze({ ...expense, amount: 12.35, cardId: 'card-active' }),
  ])
  const cards = Object.freeze([Object.freeze({ ...creditCards[0] })])

  expect(auditCardLinkage()).toMatchObject({
    savedLinkCount: 0,
    unlinkedCount: 0,
    historicalLinkCount: 0,
  })
  expect(auditCardLinkage({ transactions, creditCards: cards })).toMatchObject({
    savedLinkCount: 1,
    unlinkedCount: 0,
  })
})
